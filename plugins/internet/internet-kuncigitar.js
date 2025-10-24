import { fetch } from "liora-lib";

let handler = async (m, { conn, text, usedPrefix, command }) => {
    try {
        if (!text)
            return m.reply(
                `Enter a song title to find its guitar chords.\nExample: ${usedPrefix + command} it's only me`
            );

        await global.loading(m, conn);

        const apiUrl = global.API("btz", "/api/search/chord", { song: text }, "apikey");
        const res = await fetch(apiUrl);
        if (!res.ok) throw new Error(`HTTP ${res.status}: Failed to fetch chord.`);

        const json = await res.json();
        if (!json.result) return m.reply("No chord found or an error occurred.");

        const { title, chord } = json.result;

        const output = [`Chord Finder`, `Title: ${title}`, ``, chord.trim()].join("\n");

        await conn.sendMessage(m.chat, { text: output }, { quoted: m });
    } catch (e) {
        conn.logger.error(e);
        m.reply(`Error: ${e.message}`);
    } finally {
        await global.loading(m, conn, true);
    }
};

handler.help = ["chord"];
handler.tags = ["internet"];
handler.command = /^(chord|kunci)$/i;

export default handler;
