import { ptr, toBuffer } from "bun:ffi";
import { loadWebP, loadWebPMux } from "./ffi-loader.js";
import { validateBuffer, isWebP, isVideo, buildWhatsAppExif, execFFmpeg } from "./utils.js";

let webp, webpmux;
let sharp;

function initSticker() {
    if (!webp) webp = loadWebP();
    if (!webpmux) webpmux = loadWebPMux();

    if (!sharp) {
        try {
            sharp = require("sharp");
        } catch {
            sharp = null;
        }
    }
}

function encodeWebP(rgbaBuffer, width, height, quality = 80) {
    initSticker();

    // Validate inputs
    if (!Buffer.isBuffer(rgbaBuffer)) {
        throw new Error("rgbaBuffer must be a Buffer");
    }

    const expectedSize = width * height * 4;
    if (rgbaBuffer.length < expectedSize) {
        throw new Error(
            `Buffer too small: expected at least ${expectedSize} bytes, got ${rgbaBuffer.length}`
        );
    }

    const outputPtrBuffer = Buffer.alloc(8);
    const stride = width * 4;

    const size = webp.symbols.WebPEncodeRGBA(
        ptr(rgbaBuffer),
        width,
        height,
        stride,
        quality,
        ptr(outputPtrBuffer)
    );

    if (size === 0) {
        throw new Error("WebP encoding failed");
    }

    const dataPtr = outputPtrBuffer.readBigUInt64LE(0);
    if (dataPtr === 0n) {
        throw new Error("WebP encoding returned null pointer");
    }

    try {
        // Use toBuffer which properly handles the FFI pointer
        // This creates a copy of the data before we free the original
        const result = Buffer.from(toBuffer(dataPtr, 0, size));
        return result;
    } finally {
        // Free the WebP allocated memory - pass BigInt directly
        webp.symbols.WebPFree(dataPtr);
    }
}

async function attachExifCLI(webpBuffer, exifBuffer) {
    const { writeFileSync, unlinkSync, readFileSync } = await import("fs");
    const { execSync } = await import("child_process");
    const { tmpdir } = await import("os");
    const { join } = await import("path");

    const tmpDir = tmpdir();
    // Use process.pid for better uniqueness
    const timestamp = Date.now();
    const random = Math.random().toString(36).slice(2, 11);
    const pid = process.pid;

    const inputFile = join(tmpDir, `input_${pid}_${timestamp}_${random}.webp`);
    const exifFile = join(tmpDir, `exif_${pid}_${timestamp}_${random}.exif`);
    const outputFile = join(tmpDir, `output_${pid}_${timestamp}_${random}.webp`);

    try {
        writeFileSync(inputFile, webpBuffer);
        writeFileSync(exifFile, exifBuffer);

        try {
            execSync(`webpmux -set exif "${exifFile}" "${inputFile}" -o "${outputFile}"`, {
                stdio: "ignore",
                timeout: 30000, // Add timeout to prevent hanging
            });
            const result = readFileSync(outputFile);
            return result;
        } catch (error) {
            console.warn("webpmux CLI failed, returning original buffer:", error.message);
            return webpBuffer;
        }
    } finally {
        // Silent cleanup
        [inputFile, exifFile, outputFile].forEach((file) => {
            try {
                unlinkSync(file);
            } catch {}
        });
    }
}

async function attachExif(webpBuffer, exifBuffer) {
    initSticker();

    if (!webpmux) {
        return await attachExifCLI(webpBuffer, exifBuffer);
    }

    // Create WebPData structures
    const inputData = Buffer.alloc(16);
    inputData.writeBigUInt64LE(BigInt(ptr(webpBuffer)), 0);
    inputData.writeBigUInt64LE(BigInt(webpBuffer.length), 8);

    const exifData = Buffer.alloc(16);
    exifData.writeBigUInt64LE(BigInt(ptr(exifBuffer)), 0);
    exifData.writeBigUInt64LE(BigInt(exifBuffer.length), 8);

    const mux = webpmux.symbols.WebPMuxCreate(ptr(inputData), 1);
    if (!mux || mux === 0n) {
        console.warn("WebPMuxCreate failed, falling back to CLI");
        return await attachExifCLI(webpBuffer, exifBuffer);
    }

    let outputData = null;

    try {
        const setResult = webpmux.symbols.WebPMuxSetChunk(mux, "EXIF", ptr(exifData), 1);

        if (setResult !== 0) {
            throw new Error(`WebPMuxSetChunk failed with code: ${setResult}`);
        }

        outputData = Buffer.alloc(16);

        const assembleResult = webpmux.symbols.WebPMuxAssemble(mux, ptr(outputData));

        if (assembleResult !== 0) {
            throw new Error(`WebPMuxAssemble failed with code: ${assembleResult}`);
        }

        const outPtr = outputData.readBigUInt64LE(0);
        const outSize = Number(outputData.readBigUInt64LE(8));

        if (outPtr === 0n || outSize === 0) {
            throw new Error("WebPMuxAssemble returned invalid output");
        }

        // Use toBuffer for proper FFI pointer handling
        const output = Buffer.from(toBuffer(outPtr, 0, outSize));

        return output;
    } catch (error) {
        console.warn("WebPMux FFI failed, falling back to CLI:", error.message);
        return await attachExifCLI(webpBuffer, exifBuffer);
    } finally {
        // Clean up in correct order
        if (outputData) {
            try {
                const outPtr = outputData.readBigUInt64LE(0);
                if (outPtr !== 0n && webpmux.symbols.WebPDataClear) {
                    webpmux.symbols.WebPDataClear(ptr(outputData));
                }
            } catch (e) {
                // WebPDataClear might not be available or might fail
                console.debug("WebPDataClear failed:", e.message);
            }
        }

        if (mux && mux !== 0n) {
            try {
                webpmux.symbols.WebPMuxDelete(mux);
            } catch (e) {
                console.error("WebPMuxDelete failed:", e.message);
            }
        }
    }
}

async function processImage(inputBuffer, width, height, crop) {
    if (sharp) {
        try {
            let pipeline = sharp(inputBuffer);

            if (crop) {
                const metadata = await pipeline.metadata();
                const imgWidth = metadata.width || 512;
                const imgHeight = metadata.height || 512;
                const size = Math.min(imgWidth, imgHeight);
                const left = Math.floor((imgWidth - size) / 2);
                const top = Math.floor((imgHeight - size) / 2);

                pipeline = pipeline.extract({ left, top, width: size, height: size });
            }

            const { data, info } = await pipeline
                .resize(width, height, {
                    fit: crop ? "cover" : "contain",
                    background: { r: 0, g: 0, b: 0, alpha: 0 },
                })
                .ensureAlpha()
                .raw()
                .toBuffer({ resolveWithObject: true });

            return { data, width: info.width, height: info.height };
        } catch (err) {
            console.warn("Sharp processing failed, falling back to FFmpeg:", err.message);
        }
    }

    const vf = crop
        ? `crop='min(iw,ih)':'min(iw,ih)',scale=${width}:${height}`
        : `scale=${width}:${height}:force_original_aspect_ratio=decrease,pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2`;

    const data = await execFFmpeg(
        ["-i", "pipe:0", "-vf", vf, "-f", "rawvideo", "-pix_fmt", "rgba", "pipe:1"],
        inputBuffer
    );

    return { data, width, height };
}

async function processVideoFrame(inputBuffer, width, height, crop) {
    const vf = crop
        ? `select='eq(n\\,0)',crop='min(iw,ih)':'min(iw,ih)',scale=${width}:${height}`
        : `select='eq(n\\,0)',scale=${width}:${height}:force_original_aspect_ratio=decrease,pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2`;

    const data = await execFFmpeg(
        [
            "-i",
            "pipe:0",
            "-vf",
            vf,
            "-vframes",
            "1",
            "-f",
            "rawvideo",
            "-pix_fmt",
            "rgba",
            "pipe:1",
        ],
        inputBuffer
    );

    return { data, width, height };
}

export async function addExif(buffer, meta = {}) {
    validateBuffer(buffer, "addExif");

    if (!isWebP(buffer)) {
        throw new Error("Input is not a WebP image");
    }

    const exif = buildWhatsAppExif(meta.packName || "", meta.authorName || "", meta.emojis || []);

    return await attachExif(buffer, exif);
}

export async function sticker(buffer, options = {}) {
    validateBuffer(buffer, "sticker");

    const opts = {
        crop: Boolean(options.crop),
        quality: Math.min(100, Math.max(1, Number(options.quality) || 80)),
        packName: String(options.packName || ""),
        authorName: String(options.authorName || ""),
        emojis: Array.isArray(options.emojis) ? options.emojis : [],
    };

    if (isWebP(buffer)) {
        const exif = buildWhatsAppExif(opts.packName, opts.authorName, opts.emojis);
        return await attachExif(buffer, exif);
    }

    const processor = isVideo(buffer) ? processVideoFrame : processImage;
    const { data, width, height } = await processor(buffer, 512, 512, opts.crop);

    const webpBuffer = encodeWebP(data, width, height, opts.quality);
    const exif = buildWhatsAppExif(opts.packName, opts.authorName, opts.emojis);

    return await attachExif(webpBuffer, exif);
}

export function encodeRGBA(buf, width, height, options = {}) {
    validateBuffer(buf, "encodeRGBA");

    const w = Number(width);
    const h = Number(height);

    if (!Number.isInteger(w) || w <= 0) {
        throw new Error(`Invalid width: ${width}`);
    }
    if (!Number.isInteger(h) || h <= 0) {
        throw new Error(`Invalid height: ${height}`);
    }

    const expectedSize = w * h * 4;
    if (buf.length < expectedSize) {
        throw new Error(
            `Buffer too small: expected at least ${expectedSize} bytes, got ${buf.length} bytes`
        );
    }

    const quality = Math.min(100, Math.max(1, Number(options.quality) || 80));
    return encodeWebP(buf, w, h, quality);
}
