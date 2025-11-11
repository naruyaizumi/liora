let handler = async (m, { conn, text, usedPrefix, command }) => {
    if (!text || typeof text !== "string") {
        return m.reply(
            `Please enter a query for Felo AI.\n› Example: ${usedPrefix}${command} what date is it today?`
        );
    }

    try {
        await global.loading(m, conn);

        const apiUrl = `https://api.nekolabs.web.id/ai/feloai?text=${encodeURIComponent(text)}`;
        const response = await fetch(apiUrl);

        if (!response.ok) {
            return m.reply("Failed to connect to Felo AI. Please try again later.");
        }

        const json = await response.json();
        const result = json?.result;
        const replyText = result?.text;

        if (!replyText) {
            return m.reply("No response received from Felo AI.");
        }

        let sources = "";
        if (Array.isArray(result?.sources) && result.sources.length > 0) {
            sources =
                "\n\n*Sources:*\n" +
                result.sources
                    .slice(0, 10)
                    .map((src) => `${src.index}. ${src.title || "Untitled"}\n${src.url}`)
                    .join("\n\n");
        }

        await conn.sendMessage(
            m.chat,
            { text: `Felo AI:\n${replyText.trim()}${sources}` },
            { quoted: m }
        );
    } catch (e) {
        conn.logger.error(e);
        m.reply(`Error: ${e.message}`);
    } finally {
        await global.loading(m, conn, true);
    }
};

handler.help = ["feloai"];
handler.tags = ["ai"];
handler.command = /^(feloai)$/i;

export default handler;
