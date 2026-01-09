import { play } from "#api/play.js";

let handler = async (m, { conn, args, usedPrefix, command }) => {
    if (!args[0]) {
        return m.reply(`Need song title\nEx: ${usedPrefix + command} Bye`);
    }

    await global.loading(m, conn);

    try {
        const res = await play(args.join(" "));

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
                        mediaType: 2,
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

handler.help = ["play"];
handler.tags = ["downloader"];
handler.command = /^(play)$/i;

export default handler;
