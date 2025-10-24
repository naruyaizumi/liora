import { fetch } from "liora-lib";

let handler = async (m, { conn, args, usedPrefix, command }) => {
    if (!args[0])
        return m.reply(
            `Please provide a valid Twitter/X URL.\n› Example: ${usedPrefix + command} https://x.com/user/status/1234567890`
        );

    const url = args[0];
    await global.loading(m, conn);

    try {
        const res = await fetch(global.API("btz", "/api/download/twitter2", { url }, "apikey"));
        if (!res.ok) throw new Error(`Failed to reach API. Status: ${res.status}`);

        const json = await res.json();
        if (!json.status || !json.result?.media_extended?.length)
            throw new Error("Unable to process this Twitter/X URL.");

        const { media_extended } = json.result;

        for (const media of media_extended) {
            if (media.type === "image") {
                await conn.sendMessage(m.chat, { image: { url: media.url } }, { quoted: m });
            } else if (media.type.startsWith("video")) {
                await conn.sendMessage(m.chat, { video: { url: media.url } }, { quoted: m });
            }
        }
    } catch (e) {
        conn.logger.error(e);
        m.reply(`Error: ${e.message}`);
    } finally {
        await global.loading(m, conn, true);
    }
};

handler.help = ["twitter"];
handler.tags = ["downloader"];
handler.command = /^(twitter|twdl)$/i;

export default handler;
