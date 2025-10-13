import { uploader } from "../../lib/uploader.js";
import { fetch } from "liora-lib";

let handler = async (m, { conn, usedPrefix, command }) => {
    try {
        const q = m.quoted ? m.quoted : null;
        if (!q)
            return m.reply(
                `Enter an audio/video message to detect.\n› Example: ${usedPrefix + command} what's this song?`
            );

        await global.loading(m, conn);

        const media = await q.download().catch(() => null);
        if (!media || !media.length) return m.reply("Failed to download the media file.");

        const url = await uploader(media).catch(() => null);
        if (!url) return m.reply("Failed to upload the media to the server.");

        const api = global.API("btz", "/api/tools/whatmusic", { url }, "apikey");
        const res = await fetch(api);
        if (!res.ok) throw new Error(`HTTP ${res.status}: Failed to reach BetaBotz service.`);

        const json = await res.json();
        if (!json.status || !json.result)
            return m.reply("No matching song found for the provided clip.");

        const timestamp = new Date().toTimeString().split(" ")[0];
        const result = [
            "```",
            `┌─[${timestamp}]────────────`,
            `│  WHATMUSIC DETECTOR`,
            "└──────────────────────",
            `${json.result.trim()}`,
            "```",
        ].join("\n");

        await conn.sendMessage(m.chat, { text: result }, { quoted: m });
    } catch (e) {
        console.error(e);
        await m.reply(`Error: ${e.message}`);
    } finally {
        await global.loading(m, conn, true);
    }
};

handler.help = ["whatmusic"];
handler.tags = ["internet"];
handler.command = /^(whatmusic|judul)$/i;

export default handler;
