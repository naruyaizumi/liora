import { fetch } from "liora-lib";

let handler = async (m, { conn, text, usedPrefix, command }) => {
    if (!text || typeof text !== "string") {
        return m.reply(
            `Please enter a query for WebPilot AI.\n› Example: ${usedPrefix}${command} hello`
        );
    }

    try {
        await global.loading(m, conn);

        const apiUrl = `https://api.nekolabs.web.id/ai/webpilot-ai?text=${encodeURIComponent(text)}`;
        const response = await fetch(apiUrl, { method: "GET" });

        if (!response.ok) {
            return m.reply("Failed to connect to WebPilot AI. Please try again later.");
        }

        const json = await response.json();
        const result = json?.result;
        const replyText = result?.chat;

        if (!replyText) {
            return m.reply("No response received from WebPilot AI.");
        }

        let sources = "";
        if (Array.isArray(result?.source) && result.source.length > 0) {
            sources =
                "\n\n*Sources:*\n" +
                result.source
                    .map((src, i) => `${i + 1}. ${src.title || "Untitled"}\n${src.link}`)
                    .join("\n\n");
        }

        await conn.sendMessage(
            m.chat,
            { text: `WebPilot AI:\n${replyText.trim()}${sources}` },
            { quoted: m }
        );
    } catch (e) {
        conn.logger.error(e);
        m.reply(`Error: ${e.message}`);
    } finally {
        await global.loading(m, conn, true);
    }
};

handler.help = ["webpilotai"];
handler.tags = ["ai"];
handler.command = /^(webpilotai)$/i;

export default handler;
