import { spotify } from "#api/spotify.js";

let handler = async (m, { conn, args, usedPrefix, command }) => {
    if (!args[0]) {
        return m.reply(`Need song title\nEx: ${usedPrefix + command} Swim`);
    }

    await global.loading(m, conn);

    try {
        const res = await spotify(args.join(" "));

        if (!res?.success) {
            throw new Error(res?.error || "No audio");
        }

        const { title, channel, cover, url, downloadUrl } = res;

        if (!downloadUrl) {
            throw new Error("No download URL");
        }

        await conn.sendMessage(
            m.chat,
            {
                audio: {
                    url: downloadUrl,
                },
                mimetype: "audio/mpeg",
                contextInfo: {
                    externalAdReply: {
                        title,
                        body: channel,
                        thumbnailUrl: cover,
                        mediaUrl: url,
                        mediaType: 1,
                        renderLargerThumbnail: true,
                    },
                },
            },
            { quoted: m }
        );
    } catch (e) {
        m.reply(`Error: ${e.message}`);
    } finally {
        await global.loading(m, conn, true);
    }
};

handler.help = ["spotify"];
handler.tags = ["downloader"];
handler.command = /^(spotify)$/i;

export default handler;
