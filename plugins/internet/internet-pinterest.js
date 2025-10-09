let handler = async (m, { conn, text, usedPrefix, command }) => {
    if (!text)
        return m.reply(
            `Usage: ${usedPrefix + command} <query>\n› Example: ${usedPrefix + command} cyberpunk art`
        );

    try {
        await global.loading(m, conn);

        const apiUrl = global.API("btz", "/api/search/pinterest", { text1: text }, "apikey");
        const res = await fetch(apiUrl);
        if (!res.ok) throw new Error(`API Error: ${res.status} ${res.statusText}`);

        const data = await res.json();
        if (!data.result || data.result.length === 0)
            return m.reply(`No results found for "${text}".`);

        const results = data.result.slice(0, 20);
        const album = results.map((img, i) => ({
            image: { url: img },
            caption: `\`\`\`
Pinterest Result (${i + 1}/${results.length})
Query : ${text}
\`\`\``,
        }));

        await conn.sendMessage(m.chat, { album }, { quoted: m });
    } catch (err) {
        console.error(err);
        m.reply("Error: Failed to fetch Pinterest results.");
    } finally {
        await global.loading(m, conn, true);
    }
};

handler.help = ["pinterest"];
handler.tags = ["internet"];
handler.command = /^(pinterest|pin)$/i;

export default handler;
