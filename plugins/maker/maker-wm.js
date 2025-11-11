import { addExif, sticker } from "#add-on";

let handler = async (m, { conn, text }) => {
    const q = m.quoted ? m.quoted : m;
    if (!q || !/sticker|image|video/.test(q.mtype))
        return m.reply("Reply to a sticker, image, or video to change its watermark.");

    let [packName, authorName] = (text || "").split("|");
    packName = (packName || global.config.stickpack || "").trim();
    authorName = (authorName || global.config.stickauth || "").trim();

    await global.loading(m, conn);

    try {
        let buffer;
        const media = await q.download?.();
        if (!media) throw new Error("Failed to download media.");

        if (typeof media === "string" && /^https?:\/\//.test(media)) {
            const res = await fetch(media);
            if (!res.ok) throw new Error("Failed to fetch file from URL.");
            buffer = Buffer.from(await res.arrayBuffer());
        } else if (Buffer.isBuffer(media)) {
            buffer = media;
        } else if (media?.data) {
            buffer = Buffer.from(media.data);
        }

        if (!buffer) throw new Error("Empty buffer, media could not be processed.");

        let result;
        const isWebp =
            buffer.slice(0, 4).toString() === "RIFF" && buffer.slice(8, 12).toString() === "WEBP";

        if (isWebp) {
            result = await addExif(buffer, { packName, authorName, emojis: [] });
        } else {
            const temp = await sticker(buffer, { packName, authorName });
            result = await addExif(temp, { packName, authorName, emojis: [] });
        }

        await conn.sendMessage(m.chat, { sticker: result }, { quoted: m });
    } catch (e) {
        conn.logger.error(e);
        m.reply(`Error: ${e.message}`);
    } finally {
        await global.loading(m, conn, true);
    }
};

handler.help = ["watermark"];
handler.tags = ["maker"];
handler.command = /^(wm|watermark)$/i;

export default handler;
