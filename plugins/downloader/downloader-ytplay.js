import { fetch } from "liora-lib";

let handler = async (m, { conn, args, usedPrefix, command }) => {
    if (!args[0])
        return m.reply(`Please provide a song title.\n› Example: ${usedPrefix + command} Mata Air`);

    await global.loading(m, conn);
    try {
        const res = await fetch(
            "https://api.nekolabs.my.id/downloader/youtube/play/v1?q=" +
                encodeURIComponent(args.join(" ").trim())
        );
        const json = await res.json();
        if (!json.success || !json.result?.downloadUrl)
            return m.reply("Failed to retrieve the requested YouTube track.");
        const { title, channel, duration, cover, url } = json.result.metadata;
        const audio = await fetch(json.result.downloadUrl);
        const buffer = Buffer.from(await audio.arrayBuffer());
        await conn.sendFile(m.chat, buffer, `${title}.mp3`, "", m, true, {
            mimetype: "audio/mpeg",
            contextInfo: {
                externalAdReply: {
                    title,
                    body: `${channel} • ${duration}`,
                    thumbnailUrl: cover,
                    mediaUrl: url,
                    mediaType: 2,
                    renderLargerThumbnail: true,
                },
            },
        });
    } catch (e) {
        m.reply(`Error: ${e.message}`);
    } finally {
        await global.loading(m, conn, true);
    }
};

handler.help = ["ytplay"];
handler.tags = ["downloader"];
handler.command = /^(ytplay)$/i;

export default handler;
