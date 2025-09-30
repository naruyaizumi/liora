import fs from "fs/promises";
import crypto from "crypto";
import { execFile } from "child_process";
import { promisify } from "util";
import webp from "node-webpmux";

const execFileAsync = promisify(execFile);

async function sticker(
    { filename, mime, ext },
    { packName = "", authorName = "", crop = false, fps = 15, duration = 30 } = {}
) {
    if (!filename) return Buffer.alloc(0);

    const isVideo =
        /^video\//.test(mime) ||
        ["mp4", "webm", "mkv", "mov", "avi"].includes((ext || "").toLowerCase()) ||
        mime === "image/gif";

    const fpsSafe = Math.max(1, Math.min(Number.isFinite(fps) ? fps : 15, 30));
    const durSafe = Math.max(1, Math.min(Number.isFinite(duration) ? duration : 30, 30));
    const outPath = filename.replace(/\.[^/.]+$/, "") + ".webp";
    const TARGET = 900 * 1024;

    const mkVf = (scale, wantFps) => {
        const fit = `scale=${scale}:${scale}:force_original_aspect_ratio=decrease`;
        const box = crop ? `crop=${scale}:${scale}` : `pad=${scale}:${scale}:-1:-1:color=black@0`;
        return isVideo
            ? `${fit},${box},fps=${wantFps},format=yuva420p`
            : `${fit},${box},format=yuva420p`;
    };

    async function encodeOnce({ scale, q, fps }) {
        const vf = mkVf(scale, fps);
        const args = [
            "-y",
            "-i",
            filename,
            "-vf",
            vf,
            "-vcodec",
            "libwebp",
            "-compression_level",
            "6",
        ];

        if (isVideo) {
            args.push(
                "-t",
                String(durSafe),
                "-an",
                "-preset",
                "picture",
                "-q:v",
                String(q),
                outPath
            );
        } else {
            args.push("-frames:v", "1", "-preset", "picture", "-q:v", String(q), outPath);
        }

        await execFileAsync("ffmpeg", args);
        const stat = await fs.stat(outPath);
        const buf = await fs.readFile(outPath);
        return { size: stat.size, buffer: buf };
    }

    const tries = [];
    (function buildPlan() {
        const qList = isVideo ? [70, 75, 80, 85, 90] : [70, 75, 80, 85, 90];
        const fpsList = isVideo ? [fpsSafe, Math.max(12, fpsSafe - 3), 10, 8] : [fpsSafe];
        const scaleList = [512, 480, 448, 416, 384, 360];

        for (const q of qList) {
            for (const f of fpsList) {
                for (const s of scaleList) {
                    tries.push({ q, fps: f, scale: s });
                }
            }
        }
    })();

    let outBuf = null;
    for (const plan of tries) {
        const { size, buffer } = await encodeOnce(plan);
        outBuf = buffer;
        if (size <= TARGET) break;
    }

    const imgWebp = new webp.Image();
    await imgWebp.load(outBuf);
    const exifJson = {
        "sticker-pack-id": crypto.randomBytes(16).toString("hex"),
        "sticker-pack-name": packName,
        "sticker-pack-publisher": authorName,
        emojis: [],
    };
    const exifAttr = Buffer.from([
        0x49, 0x49, 0x2a, 0x00, 0x08, 0x00, 0x00, 0x00, 0x01, 0x00, 0x41, 0x57, 0x07, 0x00, 0x00,
        0x00, 0x00, 0x00, 0x16, 0x00, 0x00, 0x00,
    ]);
    const jsonBuf = Buffer.from(JSON.stringify(exifJson), "utf8");
    const exif = Buffer.concat([exifAttr, jsonBuf]);
    exif.writeUIntLE(jsonBuf.length, 14, 4);
    imgWebp.exif = exif;
    const finalBuf = await imgWebp.save(null);
    if (finalBuf.length > TARGET) {
        const extra = await encodeOnce({ q: 90, fps: isVideo ? 8 : fpsSafe, scale: 360 });
        await imgWebp.load(extra.buffer);
        imgWebp.exif = exif;
        return await imgWebp.save(null);
    }

    return finalBuf;
}

async function fakechat(text, name, avatar, url = false, isHD = false) {
    let body = {
        type: "quote",
        format: "png",
        backgroundColor: "#FFFFFF",
        width: isHD ? 1024 : 512,
        height: isHD ? 1536 : 768,
        scale: isHD ? 4 : 2,
        messages: [
            {
                entities: [],
                media: url ? { url: url } : null,
                avatar: true,
                from: {
                    id: 1,
                    name: name,
                    photo: {
                        url: avatar,
                    },
                },
                text: text,
                replyMessage: {},
            },
        ],
    };
    let response = await fetch("https://btzqc.betabotz.eu.org/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
    });

    if (!response.ok) throw new Error(`HTTP Error ${response.status}`);
    let { result } = await response.json();
    return Buffer.from(result.image, "base64");
}

export { sticker, fakechat };
