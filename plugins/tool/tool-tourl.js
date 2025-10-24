import {
    uploader,
    uploader2,
    uploader3,
    uploader4,
    uploader5,
} from "../../lib/uploader.js";

const uploaders = {
    1: { name: "Catbox.moe", fn: uploader },
    2: { name: "Uguu.se", fn: uploader2 },
    3: { name: "Qu.ax", fn: uploader3 },
    4: { name: "Put.icu", fn: uploader4 },
    5: { name: "Tmpfiles.org", fn: uploader5 },
};

let handler = async (m, { conn, args, usedPrefix, command }) => {
    try {
        if (!args[0] || isNaN(args[0]) || !uploaders[args[0]]) {
            const list = Object.entries(uploaders)
                .map(([num, { name }]) => `${num}. ${name}`)
                .join("\n");
            return m.reply(
                `Select upload server by number.\n› Example: ${usedPrefix + command} 1\n\nAvailable servers:\n${list}`
            );
        }

        const server = uploaders[args[0]];
        const q = m.quoted && (m.quoted.mimetype || m.quoted.mediaType) ? m.quoted : m;
        const mime = (q.msg || q).mimetype || q.mediaType || "";

        if (!mime) return m.reply("Send or reply to a media file to upload.");

        await global.loading(m, conn);

        const buffer = await q.download?.();
        if (!Buffer.isBuffer(buffer) || !buffer.length)
            return m.reply("Failed to get media buffer.");

        const url = await server.fn(buffer).catch(() => null);
        if (!url) return m.reply(`Upload failed on ${server.name}. Try another server.`);

        const sizeKB = (buffer.length / 1024).toFixed(2);
        const caption = [
            `File uploaded successfully`,
            `Server : ${server.name}`,
            `Size : ${sizeKB} KB`,
            `URL : ${url}`,
        ].join("\n");

        await conn.sendMessage(m.chat, { text: caption }, { quoted: m });
    } catch (e) {
        conn.logger.error(e);
        m.reply(`Error: ${e.message}`);
    } finally {
        await global.loading(m, conn, true);
    }
};

handler.help = ["upload"];
handler.tags = ["tools"];
handler.command = /^(tourl|url)$/i;

export default handler;
