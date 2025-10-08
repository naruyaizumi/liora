import { fetch } from "../../src/bridge.js";

let handler = async (m, { conn, text, usedPrefix, command }) => {
    try {
        if (!text)
            return m.reply(
                `Enter a song title or lyric fragment.\n› Example: ${usedPrefix + command} I was never there`
            );

        await global.loading(m, conn);
        const apiUrl = global.API("btz", "/api/search/lirik", { lirik: text }, "apikey");
        const res = await fetch(apiUrl);
        if (!res.ok) throw new Error(`HTTP ${res.status}: Failed to fetch lyrics.`);

        const json = await res.json();
        if (!json.result) return m.reply("No lyrics found for that query.");

        const { title, artist, lyrics, image, url } = json.result;
        const timestamp = new Date().toTimeString().split(" ")[0];

        const output = [
            "```",
            `┌─[${timestamp}]────────────`,
            `│  LYRICS SEARCH`,
            "└──────────────────────",
            `Title  : ${title}`,
            `Artist : ${artist}`,
            "───────────────────────",
            lyrics.trim(),
            "───────────────────────",
            `Source : ${url}`,
            "```",
        ].join("\n");

        await conn.sendMessage(
            m.chat,
            {
                text: output,
                contextInfo: {
                    externalAdReply: {
                        title: title,
                        body: `Artist: ${artist}`,
                        thumbnailUrl: image,
                        sourceUrl: url,
                        mediaType: 1,
                        renderLargerThumbnail: true,
                    },
                },
            },
            { quoted: m }
        );
    } catch (e) {
        console.error(e);
        m.reply(`Error: ${e.message}`);
    } finally {
        await global.loading(m, conn, true);
    }
};

handler.help = ["lyrics"];
handler.tags = ["internet"];
handler.command = /^(lyrics|lirik)$/i;

export default handler;
