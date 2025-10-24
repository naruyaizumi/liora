import { fetch } from "liora-lib";

let handler = async (m, { conn, text, usedPrefix, command }) => {
    if (!text)
        return m.reply(
            `Usage: ${usedPrefix + command} <query>\n› Example: ${usedPrefix + command} city`
        );

    try {
        await global.loading(m, conn);

        const apiUrl = global.API("btz", "/api/search/bing-img", { text }, "apikey");
        const res = await fetch(apiUrl);
        if (!res.ok) throw new Error(`API Error: ${res.status} ${res.statusText}`);

        const data = await res.json();
        if (!data.result || data.result.length === 0)
            return m.reply(`No results found for "${text}".`);

        const album = data.result.map((img, i) => ({
            image: { url: img },
            caption: `Result ${i + 1}/${data.result.length}`,
        }));

        await conn.sendMessage(m.chat, { album }, { quoted: m });
    } catch (e) {
        conn.logger.error(e);
        m.reply(`Error: ${e.message}`);
    } finally {
        await global.loading(m, conn, true);
    }
};

handler.help = ["bingimg"];
handler.tags = ["internet"];
handler.command = /^(bingimg|bingimage)$/i;

export default handler;
