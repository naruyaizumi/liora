import sharp from "sharp";

let handler = async (m, { conn }) => {
    let q, mime;

    if (m.message?.imageMessage) {
        q = m.message.imageMessage;
        mime = q.mimetype;
    } else if (m.quoted) {
        q = m.quoted.msg || m.quoted;
        mime = q.mimetype || "";
    }

    if (!mime || !/image\/(jpe?g|png|webp)/.test(mime))
        return m.reply("Send or reply to an image to check its resolution.");

    try {
        const buffer = await q.download?.().catch(() => null);
        if (!buffer || !buffer.length) return m.reply("Failed to download the image.");

        const { width, height } = await sharp(buffer).metadata();
        const sizeKB = (buffer.length / 1024).toFixed(2);

        const text = `
Image Resolution
Width: ${width}px
Height: ${height}px
File Size: ${sizeKB} KB
──────────────────
Image metadata retrieved successfully.
        `.trim();

        await conn.sendMessage(
            m.chat,
            {
                image: buffer,
                caption: text,
            },
            { quoted: m }
        );
    } catch (e) {
        conn.logger.error(e);
        m.reply(`Error: ${e.message}`);
    }
};

handler.help = ["cekresolution"];
handler.tags = ["tools"];
handler.command = /^(cekreso(lution)?)$/i;

export default handler;
