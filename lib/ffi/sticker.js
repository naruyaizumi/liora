import { ptr } from "bun:ffi";
import { loadWebP, loadWebPMux } from "./ffi-loader.js";
import {
  validateBuffer,
  isWebP,
  isVideo,
  buildWhatsAppExif,
  execFFmpeg,
} from "./utils.js";

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

  try {
    const dataPtr = outputPtrBuffer.readBigUInt64LE(0);
    const result = Buffer.from(new Uint8Array(Bun.peek(dataPtr, size)));
    return result;
  } finally {
    const dataPtr = outputPtrBuffer.readBigUInt64LE(0);
    if (dataPtr) webp.symbols.WebPFree(dataPtr);
  }
}

function attachExif(webpBuffer, exifBuffer) {
  initSticker();

  const inputData = Buffer.alloc(16);
  inputData.writeBigUInt64LE(BigInt(ptr(webpBuffer)), 0);
  inputData.writeBigUInt64LE(BigInt(webpBuffer.length), 8);

  const exifData = Buffer.alloc(16);
  exifData.writeBigUInt64LE(BigInt(ptr(exifBuffer)), 0);
  exifData.writeBigUInt64LE(BigInt(exifBuffer.length), 8);

  const mux = webpmux.symbols.WebPMuxCreate(ptr(inputData), 1);
  if (!mux) throw new Error("WebPMuxCreate failed");

  try {
    const setResult = webpmux.symbols.WebPMuxSetChunk(mux, "EXIF", ptr(exifData), 1);
    if (setResult !== 0) {
      throw new Error(`WebPMuxSetChunk failed: ${setResult}`);
    }

    const outputData = Buffer.alloc(16);
    webpmux.symbols.WebPDataInit(ptr(outputData));

    const assembleResult = webpmux.symbols.WebPMuxAssemble(mux, ptr(outputData));
    if (assembleResult !== 0) {
      throw new Error(`WebPMuxAssemble failed: ${assembleResult}`);
    }

    const outPtr = outputData.readBigUInt64LE(0);
    const outSize = Number(outputData.readBigUInt64LE(8));
    const output = Buffer.from(new Uint8Array(Bun.peek(outPtr, outSize)));

    webpmux.symbols.WebPDataClear(ptr(outputData));
    return output;
  } finally {
    webpmux.symbols.WebPMuxDelete(mux);
  }
}

async function processImage(inputBuffer, width, height, crop) {
  if (sharp) {
    try {
      let pipeline = sharp(inputBuffer);

      if (crop) {
        const metadata = await pipeline.metadata();
        const size = Math.min(metadata.width || 512, metadata.height || 512);
        const left = Math.floor(((metadata.width || 512) - size) / 2);
        const top = Math.floor(((metadata.height || 512) - size) / 2);

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
      console.warn("Sharp failed, using FFmpeg:", err.message);
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
    ["-i", "pipe:0", "-vf", vf, "-vframes", "1", "-f", "rawvideo", "-pix_fmt", "rgba", "pipe:1"],
    inputBuffer
  );

  return { data, width, height };
}

export async function addExif(buffer, meta = {}) {
  validateBuffer(buffer, "addExif");

  if (!isWebP(buffer)) {
    throw new Error("Input is not a WebP image");
  }

  const exif = buildWhatsAppExif(meta.packName, meta.authorName, meta.emojis);
  return attachExif(buffer, exif);
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
    return attachExif(buffer, exif);
  }

  const processor = isVideo(buffer) ? processVideoFrame : processImage;
  const { data, width, height } = await processor(buffer, 512, 512, opts.crop);

  const webpBuffer = encodeWebP(data, width, height, opts.quality);
  const exif = buildWhatsAppExif(opts.packName, opts.authorName, opts.emojis);

  return attachExif(webpBuffer, exif);
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
    throw new Error(`Buffer too small: expected ${expectedSize}, got ${buf.length}`);
  }

  const quality = Math.min(100, Math.max(1, Number(options.quality) || 80));
  return encodeWebP(buf, w, h, quality);
}