let handler = async (m, { conn, text }) => {
    if (!text || typeof text !== "string") {
        return m.reply("Please provide a valid query for Copilot AI.");
    }

    try {
        await global.loading(m, conn);

        const apiUrl = `https://api.nekolabs.web.id/ai/copilot?text=${encodeURIComponent(text)}`;
        const response = await fetch(apiUrl);
        if (!response.ok) {
            return m.reply("Unable to connect to Copilot AI. Please try again later.");
        }

        const json = await response.json();
        const replyText = json?.result?.text;
        if (!replyText) {
            return m.reply("Copilot AI did not return a response.");
        }

        await conn.sendMessage(m.chat, { text: `Copilot AI:\n${replyText.trim()}` }, { quoted: m });
    } catch (e) {
        conn.logger.error(e);
        m.reply(`Error: ${e.message}`);
    } finally {
        await global.loading(m, conn, true);
    }
};

handler.help = ["copilot"];
handler.tags = ["ai"];
handler.command = /^(copilot)$/i;

export default handler;
