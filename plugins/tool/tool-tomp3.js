let handler = async (m, { conn, usedPrefix, command }) => {
    try {
        const q = m.quoted ? m.quoted : m;
        const mime = (q.msg || q).mimetype || q.mediaType || "";

        if (!mime || !/^(video|audio)\//.test(mime))
            return m.reply(`Reply a video or audio with command:\n› ${usedPrefix + command}`);

        await global.loading(m, conn);

        const buffer = await q.download?.();
        if (!Buffer.isBuffer(buffer) || !buffer.length)
            return m.reply("Failed to get media buffer.");
        await conn.sendFile(m.chat, buffer, "output.mp3", "", m, false, {
            asAudio: true,
            mimetype: "audio/mpeg",
        });
    } catch (e) {
        console.error(e);
        m.reply(`Error during conversion:\n${e.message}`);
    } finally {
        await global.loading(m, conn, true);
    }
};

handler.help = ["tomp3"];
handler.tags = ["tools"];
handler.command = /^(tomp3|toaudio)$/i;

export default handler;
