import { fileTypeFromBuffer } from "file-type";
import { fetch } from "liora-lib";

let handler = async (m, { conn, text, usedPrefix, command }) => {
    try {
        if (!/^https?:\/\//i.test(text || ""))
            return m.reply(
                `Invalid URL format.\n› Example: ${usedPrefix + command} https://example.com/file.jpg`
            );

        await global.loading(m, conn);
        let result, buffer, mime, ext, sizeMB;
        let ok = false;

        try {
            result = await fetch(text);
            buffer = Buffer.isBuffer(result.body) ? result.body : Buffer.from(result.body);
            ok = true;

            sizeMB = (buffer.length / (1024 * 1024)).toFixed(2);

            const type = await fileTypeFromBuffer(buffer).catch(() => null);
            const headerMime = (result.headers?.["content-type"]?.[0] || "")
                .split(";")[0]
                .trim()
                .toLowerCase();
            mime = type?.mime || headerMime || "application/octet-stream";
            ext = type?.ext || mime.split("/")[1] || "bin";
        } catch {
            ok = false;
            buffer = Buffer.alloc(0);
            mime = "text/plain";
            ext = "txt";
        }

        const isJson = mime === "application/json";
        const isText = /^text\//.test(mime);
        const isImage = /^image\//.test(mime);
        const isVideo = /^video\//.test(mime);
        const isAudio = /^audio\//.test(mime);

        let caption = `
URL: ${text}
Status: ${ok ? "OK" : "ERROR"}
Size: ${sizeMB || "0.00"} MB
MIME: ${mime}
Output: result.${ext}
        `.trim();

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

            caption += `\n\nPreview:\n\`\`\`\n${content}\n\`\`\``;

            msg = {
                document: buffer,
                mimetype: mime,
                fileName: `result.${ext}`,
                caption,
            };

            await conn.sendMessage(m.chat, msg, { quoted: m });
        } else {
            if (isImage) msg = { image: buffer, caption };
            else if (isVideo) msg = { video: buffer, caption };
            else if (isAudio) msg = { audio: buffer, mimetype: mime };
            else msg = { document: buffer, mimetype: mime, fileName: `result.${ext}`, caption };

            await conn.sendMessage(m.chat, msg, { quoted: m }).catch(async () => {
                await conn.sendMessage(m.chat, { text: caption }, { quoted: m });
            });
        }
    } catch (e) {
        conn.logger.error(e);
        m.reply(`Error: ${e.message}`);
    } finally {
        await global.loading(m, conn, true);
    }
};

handler.help = ["fetch"];
handler.tags = ["internet"];
handler.command = /^(fetch|get)$/i;

export default handler;
