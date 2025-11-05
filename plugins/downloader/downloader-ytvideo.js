import { ytmp4 } from "#ytmp4";

let handler = async (m, { conn, args, usedPrefix, command }) => {
    if (!args[0])
        return m.reply(
            `Please provide a valid YouTube video link.\n› Example: ${usedPrefix + command} https://youtu.be/N2P6ARXAWMQ`
        );

    const url = args[0];
    const youtubeRegex =
        /^(https?:\/\/)?((www|m)\.)?(youtube(-nocookie)?\.com\/(watch\?v=|shorts\/|live\/)|youtu\.be\/)[\w-]+(\S+)?$/i;
    if (!youtubeRegex.test(url))
        return m.reply("Invalid URL. Only standard YouTube video links are supported.");

    await global.loading(m, conn);

    try {
        const { success, downloadUrl, error } = await ytmp4(url);
        if (!success) throw new Error(error);

        await conn.sendMessage(
            m.chat,
            {
                video: { url: downloadUrl },
                mimetype: "video/mp4",
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

handler.help = ["ytmp4"];
handler.tags = ["downloader"];
handler.command = /^(ytmp4)$/i;

export default handler;
