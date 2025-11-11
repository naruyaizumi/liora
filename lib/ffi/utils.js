export function validateBuffer(buf, fnName) {
    if (!Buffer.isBuffer(buf)) {
        throw new TypeError(`${fnName} requires a Buffer, got ${typeof buf}`);
    }
    if (buf.length === 0) {
        throw new Error(`${fnName} received empty buffer`);
    }
    return true;
}

export function isWebP(buf) {
    if (!Buffer.isBuffer(buf) || buf.length < 12) return false;
    return (
        buf[0] === 0x52 &&
        buf[1] === 0x49 &&
        buf[2] === 0x46 &&
        buf[3] === 0x46 &&
        buf[8] === 0x57 &&
        buf[9] === 0x45 &&
        buf[10] === 0x42 &&
        buf[11] === 0x50
    );
}

export function isVideo(buf) {
    if (!Buffer.isBuffer(buf) || buf.length < 12) return false;

    // MP4/MOV
    if (buf[4] === 0x66 && buf[5] === 0x74 && buf[6] === 0x79 && buf[7] === 0x70) {
        return true;
    }

    // WebM
    if (buf[0] === 0x1a && buf[1] === 0x45 && buf[2] === 0xdf && buf[3] === 0xa3) {
        return true;
    }

    // AVI
    if (
        buf[0] === 0x52 &&
        buf[1] === 0x49 &&
        buf[2] === 0x46 &&
        buf[3] === 0x46 &&
        buf[8] === 0x41 &&
        buf[9] === 0x56 &&
        buf[10] === 0x49
    ) {
        return true;
    }

    return false;
}

export function randomHex(nbytes) {
    const hex = "0123456789abcdef";
    let result = "";
    for (let i = 0; i < nbytes; i++) {
        const byte = Math.floor(Math.random() * 256);
        result += hex[(byte >> 4) & 0xf] + hex[byte & 0xf];
    }
    return result;
}

export function buildWhatsAppExif(packName = "", authorName = "", emojis = []) {
    const json = JSON.stringify({
        "sticker-pack-id": randomHex(16),
        "sticker-pack-name": packName,
        "sticker-pack-publisher": authorName,
        emojis: emojis,
    });

    const tiffHeader = Buffer.from([
        0x49, 0x49, 0x2a, 0x00, 0x08, 0x00, 0x00, 0x00, 0x01, 0x00, 0x41, 0x57, 0x07, 0x00, 0x00,
        0x00, 0x00, 0x00, 0x16, 0x00, 0x00, 0x00,
    ]);

    tiffHeader.writeUInt32LE(json.length, 14);
    return Buffer.concat([tiffHeader, Buffer.from(json, "utf-8")]);
}

export function toPointer(buffer) {
    if (!Buffer.isBuffer(buffer)) {
        throw new TypeError("Expected Buffer");
    }
    return BigInt(Bun.inspect(buffer, { colors: false }).match(/0x[0-9a-f]+/i)?.[0] || "0");
}

export async function execFFmpeg(args, inputBuffer, onData) {
    const { spawn } = await import("child_process");

    return new Promise((resolve, reject) => {
        const ffmpeg = spawn("ffmpeg", ["-hide_banner", "-loglevel", "error", ...args], {
            stdio: ["pipe", "pipe", "pipe"],
        });

        const chunks = [];
        const errors = [];

        ffmpeg.stdout.on("data", (chunk) => {
            chunks.push(chunk);
            onData?.(chunk);
        });

        ffmpeg.stderr.on("data", (chunk) => {
            errors.push(chunk.toString());
        });

        ffmpeg.on("close", (code) => {
            if (code !== 0) {
                reject(new Error(`FFmpeg failed (code ${code}): ${errors.join("")}`));
            } else {
                resolve(Buffer.concat(chunks));
            }
        });

        ffmpeg.on("error", (err) => {
            reject(new Error(`FFmpeg spawn error: ${err.message}`));
        });

        if (inputBuffer) {
            ffmpeg.stdin.write(inputBuffer);
        }
        ffmpeg.stdin.end();
    });
}
