import { threads } from "#threads";

let handler = async (m, { conn, args, usedPrefix, command }) => {
    const url = args[0];
    if (!url)
        return m.reply(
            `Please provide a valid Threads URL.\n› Example: ${usedPrefix + command} https://www.threads.net`
        );

    await global.loading(m, conn);

    try {
        const { success, caption, images, videos, error } = await threads(url);
        if (!success) throw new Error(error);

        if (videos.length > 0) {
            const videoUrl = videos[videos.length - 1];
            await conn.sendMessage(m.chat, { video: { url: videoUrl }, caption }, { quoted: m });
        } else if (images.length > 0) {
            if (images.length === 1) {
                await conn.sendMessage(
                    m.chat,
                    { image: { url: images[0] }, caption },
                    { quoted: m }
                );
            } else {
                const album = images.map((img, i) => ({
                    image: { url: img },
                    caption: `Slide ${i + 1} of ${images.length}`,
                }));
                await conn.sendAlbum(m.chat, album, { quoted: m });
            }
        } else {
            throw new Error("No media found in this Threads post.");
        }
    } catch (e) {
        conn.logger.error(e);
        m.reply(`Error: ${e.message}`);
    } finally {
        await global.loading(m, conn, true);
    }
};

handler.help = ["threads"];
handler.tags = ["downloader"];
handler.command = /^(threads)$/i;

export default handler;
