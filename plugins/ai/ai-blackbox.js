import { fetch } from "liora-lib";

let handler = async (m, { conn, text }) => {
    if (!text || typeof text !== "string") return m.reply("Enter a valid query for Blackbox AI!");

    try {
        await global.loading(m, conn);

        const apiUrl = global.API("btz", "/api/search/blackbox-chat", { text }, "apikey");

        const response = await fetch(apiUrl);
        if (!response.ok) return m.reply("Failed to process the request. Try again later.");

        const json = await response.json();
        if (!json.message) return m.reply("No response received from Blackbox AI.");

        await conn.sendMessage(m.chat, { text: json.message.trim() }, { quoted: m });
    } catch (e) {
        conn.logger.error(e);
        m.reply(`Error: ${e.message}`);
    } finally {
        await global.loading(m, conn, true);
    }
};

handler.help = ["blackbox"];
handler.tags = ["ai"];
handler.command = /^(blackbox|blackboxai)$/i;

export default handler;
