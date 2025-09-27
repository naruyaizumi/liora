import fs from "fs/promises"
import crypto from "crypto"
import { execFile } from "child_process"
import { promisify } from "util"
import webp from "node-webpmux"

const execFileAsync = promisify(execFile)

async function sticker(
  { filename, data, mime, ext },
  { packName = "", authorName = "", crop = false, fps = 15, duration = 30 } = {}
) {
  if (!filename) return Buffer.alloc(0)

  const isVideo =
    /^video\//.test(mime) ||
    ["mp4", "webm", "mkv", "mov", "avi"].includes(ext) ||
    mime === "image/gif"

  const fpsSafe = Math.max(1, Math.min(fps, 30))
  const durSafe = Math.max(1, Math.min(duration, 30))
  const outputPath = filename.replace(/\.[^/.]+$/, "") + ".webp"

  const vf = [
    "scale=512:512:force_original_aspect_ratio=decrease",
    crop ? "crop=512:512" : "pad=512:512:-1:-1:color=white"
  ].join(",")

  const args = [
    "-y",
    "-i", filename,
    "-vf", vf,
    "-vcodec", "libwebp"
  ]

  if (isVideo) {
    args.push(
      "-t", String(durSafe),
      "-r", String(fpsSafe),
      "-loop", "0",
      "-an",
      "-preset", "default",
      "-q:v", "60",
      "-b:v", "500k",
      "-fs", "1000k",
      outputPath
    )
  } else {
    args.push(
      "-frames:v", "1",
      "-q:v", "80",
      outputPath
    )
  }

  await execFileAsync("ffmpeg", args)
  
  let buffer = await fs.readFile(outputPath)
  const imgWebp = new webp.Image()
  await imgWebp.load(buffer)
  const meta = {
    "sticker-pack-id": crypto.randomBytes(16).toString("hex"),
    "sticker-pack-name": packName,
    "sticker-pack-publisher": authorName,
    emojis: []
  }
  const exifAttr = Buffer.from([
    0x49,0x49,0x2a,0x00,
    0x08,0x00,0x00,0x00,
    0x01,0x00,0x41,0x57,
    0x07,0x00,0x00,0x00,
    0x00,0x00,0x16,0x00,
    0x00,0x00
  ])
  const jsonBuffer = Buffer.from(JSON.stringify(meta), "utf8")
  const exif = Buffer.concat([exifAttr, jsonBuffer])
  exif.writeUIntLE(jsonBuffer.length, 14, 4)
  imgWebp.exif = exif
  buffer = await imgWebp.save(null)

  return buffer
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