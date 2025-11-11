import { convert } from "#add-on";

let handler = async (m, { conn, usedPrefix, command }) => {
    try {
        const q = m.quoted ? m.quoted : m;
        const mime = (q.msg || q).mimetype || q.mediaType || "";

        if (!mime || !/^(video|audio)\//.test(mime))
            return m.reply(`Reply a video or audio with command:\n› ${usedPrefix + command}`);

        await global.loading(m, conn);

        const buffer = await q.download?.();
        if (!Buffer.isBuffer(buffer)) return m.reply("Failed to fetch media buffer.");

        const audio = await convert(buffer, { format: "mp3" });
        if (!Buffer.isBuffer(audio) || !audio.length)
            return m.reply("Conversion failed: empty result.");

        await conn.sendMessage(
            m.chat,
            {
                audio,
                mimetype: "audio/mpeg",
                fileName: "output.mp3",
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

handler.help = ["tomp3"];
handler.tags = ["tools"];
handler.command = /^(tomp3|toaudio)$/i;

export default handler;
