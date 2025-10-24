import { fetch } from "liora-lib";

let handler = async (m, { conn, text, usedPrefix, command }) => {
    if (!text)
        return m.reply(
            `Usage: ${usedPrefix + command} <query>\n› Example: ${usedPrefix + command} art`
        );

    try {
        await global.loading(m, conn);

        const apiUrl = global.API("btz", "/api/search/pinterest", { text1: text }, "apikey");
        const res = await fetch(apiUrl);
        if (!res.ok) throw new Error(`API Error: ${res.status} ${res.statusText}`);
        const data = await res.json();
        if (!data.result || data.result.length === 0)
            return m.reply(`No results found for "${text}".`);
        const results = data.result.slice(0, 30);
        const album = results.map((img, i) => ({
            image: { url: img },
            caption: `Pinterest Result (${i + 1}/${results.length})`,
        }));

        await conn.sendMessage(m.chat, { album }, { quoted: m });
    } catch (e) {
        conn.logger.error(e);
        m.reply(`Error: ${e.message}`);
    } finally {
        await global.loading(m, conn, true);
    }
};

handler.help = ["pinterest"];
handler.tags = ["internet"];
handler.command = /^(pinterest)$/i;

export default handler;
