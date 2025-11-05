import { removebg } from "#removebg";

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

        const img = await q.download().catch(() => null);
        if (!img || !(img instanceof Buffer)) return;

        const { success, resultUrl, resultBuffer, error } = await removebg(img);
        if (!success) throw new Error(error || "Background removal failed");

        await conn.sendMessage(
            m.chat,
            {
                image: resultBuffer ? { buffer: resultBuffer } : { url: resultUrl },
                caption: "Background removed successfully.",
            },
            { quoted: m }
        );
    } catch (e) {
        conn.logger.error(e);
        m.reply("Failed to remove background.");
    } finally {
        await global.loading(m, conn, true);
    }
};

handler.help = ["removebg"];
handler.tags = ["tools"];
handler.command = /^(removebg)$/i;

export default handler;
