import { ytmp3 } from "#ytmp3";

let handler = async (m, { conn, args, usedPrefix, command }) => {
    if (!args[0])
        return m.reply(
            `Please provide a valid YouTube or YouTube Music link.\n› Example: ${usedPrefix + command} https://music.youtube.com`
        );

    const url = args[0];
    const youtubeRegex =
        /^(https?:\/\/)?((www|m|music)\.)?(youtube(-nocookie)?\.com\/(watch\?v=|shorts\/|live\/)|youtu\.be\/)[\w-]+(\S+)?$/i;
    if (!youtubeRegex.test(url))
        return m.reply("Invalid URL! Please provide a valid YouTube or YouTube Music link.");

    await global.loading(m, conn);

    try {
        const { success, downloadUrl, error } = await ytmp3(url);
        if (!success) throw new Error(error);

        await conn.sendMessage(
            m.chat,
            {
                audio: { url: downloadUrl },
                mimetype: "audio/mpeg",
            },
            { quoted: m }
        );
    } catch (e) {
        conn.logger.error(e);
        m.reply(`Error: ${e.message}`);
    } finally {
        await global.loading(m, conn, true);
    }
};

handler.help = ["ytmp3"];
handler.tags = ["downloader"];
handler.command = /^(ytmp3)$/i;

export default handler;
