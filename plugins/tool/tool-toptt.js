import { convert } from "#add-on";

let handler = async (m, { conn, usedPrefix, command }) => {
    try {
        const q = m.quoted ? m.quoted : m;
        const mime = (q.msg || q).mimetype || q.mediaType || "";

        if (!mime || !/^(video|audio)\//.test(mime))
            return m.reply(`Reply a video or audio with command:\n› ${usedPrefix + command}`);

        await global.loading(m, conn);

        const buffer = await q.download?.();
        if (!Buffer.isBuffer(buffer) || buffer.length === 0)
            return m.reply("Failed to get media buffer.");

        const audio = await convert(buffer, {
            format: "opus",
            sampleRate: 48000,
            channels: 1,
            bitrate: "64k",
            ptt: true,
        });

        const finalBuffer =
            audio instanceof Buffer
                ? audio
                : audio?.buffer
                  ? Buffer.from(audio.buffer)
                  : audio?.data
                    ? Buffer.from(audio.data)
                    : Buffer.from(audio);

        await conn.sendMessage(
            m.chat,
            {
                audio: finalBuffer,
                mimetype: "audio/ogg; codecs=opus",
                ptt: true,
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

handler.help = ["toptt"];
handler.tags = ["tools"];
handler.command = /^(toptt|tovn)$/i;

export default handler;
