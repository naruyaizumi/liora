import sharp from "sharp";

let handler = async (m, { conn, usedPrefix, command }) => {
    try {
        const q = m.quoted ? m.quoted : m;
        const mime = (q.msg || q).mimetype || q.mediaType || "";
        if (!/webp/.test(mime))
            return m.reply(`Reply a sticker with the command: ${usedPrefix + command}`);

        await global.loading(m, conn);

        const buffer = await q.download?.();
        if (!buffer || !Buffer.isBuffer(buffer))
            throw new Error("Failed to download sticker buffer.");

        const output = await sharp(buffer).png().toBuffer();
        if (!output.length) throw new Error("Conversion failed, output is empty.");

        await conn.sendMessage(
            m.chat,
            { image: output, caption: "Sticker successfully converted to image." },
            { quoted: m }
        );
    } catch (e) {
        conn.logger.error(e);
        m.reply(`Error: ${e.message}`);
    } finally {
        await global.loading(m, conn, true);
    }
};

handler.help = ["toimg"];
handler.tags = ["maker"];
handler.command = /^(toimg)$/i;

export default handler;
