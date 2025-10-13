import { fetch } from "liora-lib";

let handler = async (m, { conn, text, usedPrefix, command }) => {
    try {
        if (!text)
            return m.reply(
                `Enter your question.\n› Example: ${usedPrefix + command} What is Artificial Intelligence?`
            );

        await global.loading(m, conn);

        const apiUrl = global.API("btz", "/api/search/openai-chat", { text }, "apikey");
        const response = await fetch(apiUrl);
        if (!response.ok) return m.reply("Request failed. Please try again later.");

        const json = await response.json();
        if (!json.message) return m.reply("No response received from OpenAI.");

        const timestamp = new Date().toTimeString().split(" ")[0];
        const output = [
            "```",
            `┌─[${timestamp}]────────────`,
            `│  OPENAI CHAT RESPONSE`,
            "└──────────────────────",
            json.message.trim(),
            "───────────────────────",
            "```",
        ].join("\n");

        await conn.sendMessage(m.chat, { text: output }, { quoted: m });
    } catch (e) {
        console.error(e);
        m.reply("Error: " + e.message);
    } finally {
        await global.loading(m, conn, true);
    }
};

handler.help = ["ai"];
handler.tags = ["ai"];
handler.command = /^(ai|openai)$/i;

export default handler;
