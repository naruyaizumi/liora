import { fetch } from "liora-lib";

let handler = async (m, { conn, text, usedPrefix, command }) => {
    if (!text || typeof text !== "string") {
        return m.reply(
            `Please enter a message for Venice AI.\n› Example: ${usedPrefix}${command} hello`
        );
    }

    try {
        await global.loading(m, conn);

        const apiUrl = `https://api.nekolabs.web.id/ai/venice?text=${encodeURIComponent(text)}`;
        const response = await fetch(apiUrl, { method: "GET" });

        if (!response.ok) {
            return m.reply("Failed to connect to Venice AI. Please try again later.");
        }

        const json = await response.json();
        const replyText = json?.result;

        if (!replyText) {
            return m.reply("No response received from Venice AI.");
        }

        await conn.sendMessage(m.chat, { text: `Venice AI:\n${replyText.trim()}` }, { quoted: m });
    } catch (e) {
        conn.logger.error(e);
        m.reply(`Error: ${e.message}`);
    } finally {
        await global.loading(m, conn, true);
    }
};

handler.help = ["veniceai"];
handler.tags = ["ai"];
handler.command = /^(veniceai)$/i;

export default handler;
