import { threads } from "#api/threads.js";

let handler = async (m, { conn, args, usedPrefix, command }) => {
    const url = args[0];
    if (!url) {
        return m.reply(`Need Threads URL\nEx: ${usedPrefix + command} https://threads.net/xxx`);
    }

    await global.loading(m, conn);

    try {
        const { success, caption, images, videos, error } = await threads(url);
        if (!success) throw new Error(error);

        if (videos.length > 0) {
            const v = videos[videos.length - 1];
            await conn.sendMessage(m.chat, { video: { url: v }, caption }, { quoted: m });
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
                    caption: `${i + 1}/${images.length}`,
                }));
                await conn.client(m.chat, album, { quoted: m });
            }
        } else {
            throw new Error("No media found");
        }
    } catch (e) {
        m.reply(`Error: ${e.message}`);
    } finally {
        await global.loading(m, conn, true);
    }
};

handler.help = ["threads"];
handler.tags = ["downloader"];
handler.command = /^(threads)$/i;

export default handler;
