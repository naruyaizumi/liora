import { sticker } from "#add-on";

let handler = async (m, { conn, text, usedPrefix, command }) => {
    try {
        const rawText = m.quoted?.text || text || "";
        const cleanText = rawText
            .replace(new RegExp(`^\\${usedPrefix}${command}\\s*`, "i"), "")
            .trim();

        if (!cleanText)
            return m.reply(
                `Usage:\n› ${usedPrefix + command} <text> Or reply to a message you want to turn into a quote.`
            );

        const name = (await m.quoted?.name) || m.pushName || (await m.name) || "Anonymous";

        const senderJid = m.quoted?.sender || m.sender;
        const profile = await conn.profilePictureUrl(senderJid, "image").catch(() => null);

        const avatar = profile || "https://qu.ax/yqEpZ.jpg";

        await global.loading(m, conn);

        const api = `https://api.nekolabs.web.id/canvas/quote-chat?text=${encodeURIComponent(
            cleanText
        )}&name=${encodeURIComponent(name)}&profile=${encodeURIComponent(avatar)}&color=%23000000`;

        const res = await fetch(api);
        if (!res.ok) throw new Error("Failed to contact Quote Chat API.");

        const buffer = Buffer.from(await res.arrayBuffer());
        const stickerImage = await sticker(buffer, {
            packName: global.config.stickpack || "",
            authorName: global.config.stickauth || "",
        });

        await conn.sendMessage(m.chat, { sticker: stickerImage }, { quoted: m });
    } catch (e) {
        conn.logger.error(e);
        m.reply(`Error: ${e.message}`);
    } finally {
        await global.loading(m, conn, true);
    }
};

handler.help = ["qc"];
handler.tags = ["maker"];
handler.command = /^(qc)$/i;

export default handler;
