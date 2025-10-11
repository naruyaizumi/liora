import { mkdtemp, open, stat, rm } from "fs/promises";
import os from "os";
import path from "path";
import { fileTypeFromBuffer } from "file-type";
import { fetch } from "../../src/bridge.js";

let handler = async (m, { conn, text, usedPrefix, command }) => {
    if (!/^https?:\/\//i.test(text || ""))
        return m.reply(
            `Invalid URL format.\n› Example: ${usedPrefix + command} https://example.com/file.jpg`
        );

    await global.loading(m, conn);

    const timestamp = new Date().toTimeString().split(" ")[0];
    const tmpDir = await mkdtemp(path.join(os.tmpdir(), "fetch-"));
    const tmpFile = path.join(tmpDir, "result.bin");

    let result, buffer, mime, ext, sizeMB;
    let headersRaw = "";
    let ok = false;

    try {
        result = await fetch(text);
        buffer = Buffer.isBuffer(result.body) ? result.body : Buffer.from(result.body);
        ok = true;

        const handle = await open(tmpFile, "wx");
        await handle.writeFile(buffer);
        await handle.close();

        const stats = await stat(tmpFile);
        sizeMB = (stats.size / (1024 * 1024)).toFixed(2);

        const type = await fileTypeFromBuffer(buffer).catch(() => null);
        const headerMime = (result.headers?.["content-type"]?.[0] || "")
            .split(";")[0]
            .trim()
            .toLowerCase();
        mime = type?.mime || headerMime || "application/octet-stream";
        ext = type?.ext || mime.split("/")[1] || "bin";

        if (result.headers && typeof result.headers === "object") {
            headersRaw = Object.entries(result.headers)
                .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(", ") : v}`)
                .join("\n");
        }
    } catch (err) {
        ok = false;
        buffer = Buffer.alloc(0);
        mime = "text/plain";
        ext = "txt";
        headersRaw = err?.message || "Fetch failed.";
    }

    const isJson = mime === "application/json";
    const isText = /^text\//.test(mime);
    const isImage = /^image\//.test(mime);
    const isVideo = /^video\//.test(mime);
    const isAudio = /^audio\//.test(mime);

    let caption = [
        "```",
        `┌─[${timestamp}]─────────────`,
        `│  Debug Fetch Log`,
        "└────────────────────────────",
        `URL : ${text}`,
        `Status : ${ok ? "OK" : "ERROR"}`,
        `Size : ${sizeMB || "0.00"} MB`,
        `MIME : ${mime}`,
        `Output : result.${ext}`,
        "────────────────────────────",
        "HEADERS (Top 10):",
        headersRaw.split("\n").slice(0, 10).join("\n") || "(no headers)",
        "```",
    ].join("\n");

    let msg;

    if (isJson || isText) {
        let content = buffer.toString("utf-8");
        if (isJson) {
            try {
                content = JSON.stringify(JSON.parse(content), null, 2);
            } catch {
                /* ignore */
            }
        }
        if (content.length > 5000) content = content.slice(0, 5000) + "\n\n[ truncated :v ]";

        caption += `\n────────────────────────────\nPreview:\n\`\`\`\n${content}\n\`\`\``;

        msg = {
            document: buffer,
            mimetype: mime,
            fileName: `result.${ext}`,
            caption,
        };

        await conn.sendMessage(m.chat, msg, { quoted: m });
    } else if (isImage) msg = { image: buffer, caption };
    else if (isVideo) msg = { video: buffer, caption };
    else if (isAudio) msg = { audio: buffer, mimetype: mime };
    else msg = { document: buffer, mimetype: mime, fileName: `result.${ext}`, caption };

    if (!isJson && !isText)
        await conn.sendMessage(m.chat, msg, { quoted: m }).catch(async () => {
            await conn.sendMessage(m.chat, { text: caption }, { quoted: m });
        });

    await rm(tmpDir, { recursive: true, force: true }).catch(() => {});
    await global.loading(m, conn, true);
};

handler.help = ["fetch"];
handler.tags = ["internet"];
handler.command = /^(fetch|get)$/i;
handler.mods = true;

export default handler;
