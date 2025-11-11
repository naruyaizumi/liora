let handler = async (m, { conn, text, usedPrefix, command }) => {
    try {
        if (!text)
            return m.reply(
                `Enter your question.\n› Example: ${usedPrefix + command} What is Artificial Intelligence?`
            );

        await global.loading(m, conn);

        const apiUrl = `https://api.nekolabs.web.id/ai/ai4chat?text=${encodeURIComponent(text)}`;
        const response = await fetch(apiUrl);

        if (!response.ok) return m.reply("Request failed. Please try again later.");

        const json = await response.json();
        if (!json.result) return m.reply("No response received from the API.");

        await conn.sendMessage(m.chat, { text: json.result.trim() }, { quoted: m });
    } catch (e) {
        conn.logger.error(e);
        m.reply(`Error: ${e.message}`);
    } finally {
        await global.loading(m, conn, true);
    }
};

handler.help = ["ai"];
handler.tags = ["ai"];
handler.command = /^(ai|openai)$/i;

export default handler;
