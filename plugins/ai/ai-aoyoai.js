import { fetch } from "liora-lib";

let handler = async (m, { conn, text, usedPrefix, command }) => {
    if (!text || typeof text !== "string") {
        return m.reply(
            `Please enter a query for Aoyo AI.\n› Example: ${usedPrefix}${command} hello aoyo`
        );
    }

    try {
        await global.loading(m, conn);

        const apiUrl = `https://api.nekolabs.my.id/ai/aoyoai?text=${encodeURIComponent(text)}`;
        const response = await fetch(apiUrl, { method: "GET" });

        if (!response.ok) {
            return m.reply("Failed to connect to Aoyo AI. Please try again later.");
        }

        const json = await response.json();
        const replyText = json?.result;
        if (!replyText) {
            return m.reply("No response received from Aoyo AI.");
        }

        await conn.sendMessage(m.chat, { text: `*Aoyo AI:*\n${replyText.trim()}` }, { quoted: m });
    } catch (e) {
        conn.logger.error(e);
        m.reply(`Error: ${e.message}`);
    } finally {
        await global.loading(m, conn, true);
    }
};

handler.help = ["aoyoai"];
handler.tags = ["ai"];
handler.command = /^(aoyoai)$/i;

export default handler;
