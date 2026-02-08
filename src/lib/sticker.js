/**
 * @file WebP sticker conversion utility using Bun native APIs
 * @module lib/sticker
 * @description Converts images and videos to WhatsApp sticker format (WebP) with EXIF metadata.
 * @license Apache-2.0
 * @author Naruya Izumi
 */

import webp from "node-webpmux";

export async function imageToWebp(buffer, options = {}) {
    const { quality = 90 } = options;

    const proc = Bun.spawn(
        [
            "ffmpeg",
            "-i",
            "pipe:0",
            "-vcodec",
            "libwebp",
            "-vf",
            `scale='min(320,iw)':min'(320,ih)':force_original_aspect_ratio=decrease,fps=fps=15,pad=320:320:-1:-1:color=0x00000000,split[a][b];[a]palettegen=reserve_transparent=on:transparency_color=ffffff[p];[b][p]paletteuse`,
            "-lossless",
            "0",
            "-q:v",
            quality.toString(),
            "-preset",
            "default",
            "-loop",
            "0",
            "-an",
            "-vsync",
            "0",
            "-f",
            "webp",
            "pipe:1",
        ],
        {
            stdin: "pipe",
            stdout: "pipe",
            stderr: "pipe",
        }
    );

    proc.stdin.write(buffer);
    proc.stdin.end();

    const exitCode = await proc.exited;

    if (exitCode !== 0) {
        const stderr = await new Response(proc.stderr).text();
        throw new Error(`FFmpeg failed: ${stderr.slice(0, 200)}`);
    }

    const output = await new Response(proc.stdout).arrayBuffer();
    return Buffer.from(output);
}

export async function videoToWebp(buffer, options = {}) {
    const { maxDuration = 30 } = options;

    const base64 = buffer.toString("base64");
    const endTime =
        maxDuration > 30 ? "00:00:30.0" : `00:00:${String(maxDuration).padStart(2, "0")}.0`;

    const payload = {
        file: `data:video/mp4;base64,${base64}`,
        processOptions: {
            crop: false,
            startTime: "00:00:00.0",
            endTime,
            loop: 0,
        },
        stickerMetadata: {},
        sessionInfo: {
            WA_VERSION: "2.2106.5",
            PAGE_UA:
                "WhatsApp/2.2037.6 Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/85.0.4183.83 Safari/537.36",
            WA_AUTOMATE_VERSION: "3.6.10",
            BROWSER_VERSION: "HeadlessChrome/88.0.4324.190",
            OS: "Linux",
            START_TS: Date.now(),
            NUM: "6247",
            LAUNCH_TIME_MS: 7934,
            PHONE_VERSION: "2.20.205.16",
        },
        config: {
            sessionId: "session",
            headless: true,
            qrTimeout: 20,
            authTimeout: 0,
            cacheEnabled: false,
            useChrome: true,
            killProcessOnBrowserClose: true,
            throwErrorOnTosBlock: false,
            chromiumArgs: [
                "--no-sandbox",
                "--disable-setuid-sandbox",
                "--aggressive-cache-discard",
                "--disable-cache",
                "--disable-application-cache",
                "--disable-offline-load-stale-cache",
                "--disk-cache-size=0",
            ],
            skipBrokenMethodsCheck: true,
            stickerServerEndpoint: true,
        },
    };

    const res = await fetch("https://sticker-api.openwa.dev/convertMp4BufferToWebpDataUrl", {
        method: "POST",
        headers: {
            Accept: "application/json, text/plain, */*",
            "Content-Type": "application/json;charset=utf-8",
        },
        body: JSON.stringify(payload),
    });

    if (!res.ok) {
        throw new Error(`API failed: ${res.statusText}`);
    }

    const text = await res.text();
    const base64Data = text.split(";base64,")[1];

    if (!base64Data) {
        throw new Error("Invalid API response");
    }

    return Buffer.from(base64Data, "base64");
}

export async function addExif(webpBuffer, metadata = {}) {
    if (!Buffer.isBuffer(webpBuffer)) {
        throw new Error("Input must be a WebP Buffer");
    }

    const isWebp =
        webpBuffer[0] === 0x52 &&
        webpBuffer[1] === 0x49 &&
        webpBuffer[2] === 0x46 &&
        webpBuffer[3] === 0x46 &&
        webpBuffer[8] === 0x57 &&
        webpBuffer[9] === 0x45 &&
        webpBuffer[10] === 0x42 &&
        webpBuffer[11] === 0x50;

    if (!isWebp) {
        throw new Error("Not a valid WebP");
    }

    const img = new webp.Image();
    const exifData = {
        "sticker-pack-id": metadata.packId || `liora-${Date.now()}`,
        "sticker-pack-name": metadata.packName || "Liora",
        "sticker-pack-publisher": metadata.packPublish || "© Naruya Izumi",
        "android-app-store-link":
            metadata.androidApp || "https://play.google.com/store/apps/details?id=com.whatsapp",
        "ios-app-store-link":
            metadata.iOSApp || "https://apps.apple.com/app/whatsapp-messenger/id310633997",
        emojis: metadata.emojis || ["😋", "😎", "🤣"],
        "is-avatar-sticker": metadata.isAvatar || 0,
    };

    const exifAttr = Buffer.from([
        0x49, 0x49, 0x2a, 0x00, 0x08, 0x00, 0x00, 0x00, 0x01, 0x00, 0x41, 0x57, 0x07, 0x00, 0x00,
        0x00, 0x00, 0x00, 0x16, 0x00, 0x00, 0x00,
    ]);

    const jsonBuffer = Buffer.from(JSON.stringify(exifData), "utf-8");
    const exif = Buffer.concat([exifAttr, jsonBuffer]);
    exif.writeUIntLE(jsonBuffer.length, 14, 4);

    await img.load(webpBuffer);
    img.exif = exif;

    return await img.save(null);
}

export async function sticker(buffer, options = {}) {
    if (!Buffer.isBuffer(buffer)) {
        throw new Error("Input must be a Buffer");
    }

    if (buffer.length === 0) {
        throw new Error("Empty buffer");
    }

    let isVideo = false;

    if (buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46) {
        isVideo = true;
    } else if (
        buffer[0] === 0x52 &&
        buffer[1] === 0x49 &&
        buffer[2] === 0x46 &&
        buffer[3] === 0x46
    ) {
        if (
            buffer[8] === 0x57 &&
            buffer[9] === 0x45 &&
            buffer[10] === 0x42 &&
            buffer[11] === 0x50
        ) {
            return addExif(buffer, {
                packName: options.packName,
                packPublish: options.authorName,
                emojis: options.emojis,
            });
        }
    } else if (
        (buffer[4] === 0x66 && buffer[5] === 0x74 && buffer[6] === 0x79 && buffer[7] === 0x78) ||
        (buffer[0] === 0x00 && buffer[1] === 0x00 && buffer[2] === 0x00) ||
        (buffer[0] === 0x1a && buffer[1] === 0x45 && buffer[2] === 0xdf && buffer[3] === 0xa3)
    ) {
        isVideo = true;
    }

    let webpBuffer;
    if (isVideo) {
        webpBuffer = await videoToWebp(buffer, {
            fps: options.fps || 15,
            maxDuration: options.maxDuration || 10,
        });
    } else {
        webpBuffer = await imageToWebp(buffer, {
            quality: options.quality || 90,
        });
    }

    const result = await addExif(webpBuffer, {
        packName: options.packName,
        packPublish: options.authorName,
        emojis: options.emojis,
    });

    return result;
}