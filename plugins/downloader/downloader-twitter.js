import { twitter } from "#twitter";

let handler = async (m, { conn, args, usedPrefix, command }) => {
    if (!args[0])
        return m.reply(
            `Please provide a valid Twitter/X URL.\n› Example: ${usedPrefix + command} https://x.com`
        );

    await global.loading(m, conn);
    try {
        const { success, photos, video, error } = await twitter(args[0]);
        if (!success) throw new Error(error);

        if (photos?.length === 1) {
            await conn.sendMessage(
                m.chat,
                { image: { url: photos[0] }, caption: null },
                { quoted: m }
            );
        } else if (photos?.length > 1) {
            const album = photos.map((img, i) => ({
                image: { url: img },
                caption: `Slide ${i + 1} of ${photos.length}`,
            }));
            await conn.sendAlbum(m.chat, album, { quoted: m });
        } else if (video) {
            await conn.sendMessage(
                m.chat,
                {
                    video: { url: video },
                    fileName: `twitter.mp4`,
                },
                { quoted: m }
            );
        } else {
            throw new Error("No media found in this tweet.");
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
handler.command = /^(twitter)$/i;

export default handler;
