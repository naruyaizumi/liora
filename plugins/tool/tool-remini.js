import { remini } from "#remini";

let handler = async (m, { conn, command, usedPrefix }) => {
    const q = m.quoted && m.quoted.mimetype ? m.quoted : m;
    const mime = (q.msg || q).mimetype || "";

    if (!q || typeof q.download !== "function" || !/image\/(jpe?g|png|webp)/i.test(mime)) {
        return m.reply(
            `Please send or reply to an image before using this command.\nExample: ${usedPrefix}${command} < reply to image or send image with caption`
        );
    }

    try {
        await global.loading(m, conn);
        const media = await q.download().catch(() => null);
        if (!media || !Buffer.isBuffer(media)) return m.reply("Invalid image buffer.");
        const { success, resultUrl, resultBuffer, error } = await remini(media);
        if (!success) throw new Error(error || "Enhancement failed");
        
        if (resultBuffer) {
            await conn.sendMessage(
                m.chat,
                {
                    image: resultBuffer,
                    caption: "Image enhancement successful.",
                },
                { quoted: m }
            );
        } else {
            await conn.sendMessage(
                m.chat,
                {
                    image: { url: resultUrl },
                    caption: "Image enhancement successful.",
                },
                { quoted: m }
            );
        }
    } catch (e) {
        conn.logger.error(e);
        m.reply("Failed to enhance image.");
    } finally {
        await global.loading(m, conn, true);
    }
};

handler.help = ["hd"];
handler.tags = ["tools"];
handler.command = /^(remini|hd)$/i;

export default handler;
