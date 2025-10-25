import { fetch } from "liora-lib";

let handler = async (m, { conn, text, usedPrefix, command }) => {
    if (!text || typeof text !== "string") {
        return m.reply(
            `Please enter a query for Ayesoul AI.\n› Example: ${usedPrefix}${command} Wikipedia Albert Einstein`
        );
    }

    try {
        await global.loading(m, conn);

        const apiUrl = `https://api.nekolabs.web.id/ai/ayesoul?text=${encodeURIComponent(text)}`;
        const response = await fetch(apiUrl);

        if (!response.ok) {
            return m.reply("Failed to connect to Ayesoul AI. Please try again later.");
        }

        const json = await response.json();
        const result = json?.result;
        const replyText = result?.message;

        if (!replyText) {
            return m.reply("No response received from Ayesoul AI.");
        }

        let sources = "";
        if (Array.isArray(result?.sourcesRaw) && result.sourcesRaw.length > 0) {
            sources =
                "\n\n*Sources:*\n" +
                result.sourcesRaw.map((url, i) => `${i + 1}. ${url}`).join("\n");
        }
        let followUps = "";
        if (Array.isArray(result?.followUpQuestions) && result.followUpQuestions.length > 0) {
            const questions = result.followUpQuestions.map((q) => q.question).join(", ");
            followUps = `\n\n*Related Questions:* ${questions}`;
        }

        await conn.sendMessage(
            m.chat,
            { text: `Ayesoul AI:\n${replyText.trim()}${sources}${followUps}` },
            { quoted: m }
        );
    } catch (e) {
        conn.logger.error(e);
        m.reply(`Error: ${e.message}`);
    } finally {
        await global.loading(m, conn, true);
    }
};

handler.help = ["ayesoul"];
handler.tags = ["ai"];
handler.command = /^(ayesoul)$/i;

export default handler;
