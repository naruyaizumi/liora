import { fetch } from "liora-lib";

let handler = async (m, { conn, text, usedPrefix, command }) => {
    if (!text)
        return m.reply(
            `Please enter a query\n› Example: ${usedPrefix + command} supra mk4`
        );

    try {
        await global.loading(m, conn);

        const apiUrl = `https://api.nekolabs.web.id/discovery/pinterest/search?q=${encodeURIComponent(text)}`;
        const res = await fetch(apiUrl);
        if (!res.ok) throw new Error(`API Error: ${res.status} ${res.statusText}`);
        const data = await res.json();
        if (!data.success || !data.result || data.result.length === 0)
            return m.reply(`No results found for "${text}".`);

        const album = data.result.map((img, i) => ({
            image: { url: img.imageUrl },
            caption: `Slide ${i + 1} of ${data.result.length}`,
        }));

        await conn.sendAlbum(m.chat, album, { quoted: m });
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