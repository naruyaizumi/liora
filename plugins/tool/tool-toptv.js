let handler = async (m, { conn, usedPrefix, command }) => {
    if (!m.quoted || !/video/.test(m.quoted.mimetype || ""))
        return m.reply(`Reply a video with command:\n› ${usedPrefix + command}`);

    await global.loading(m, conn);

    try {
        const q = await m.quoted.download();
        if (!q || !q.length) return m.reply("Failed to download video buffer.");

        await conn.sendFile(m.chat, q, "ptv.mp4", null, m, false, { asPTV: true });
    } catch (e) {
        console.error(e);
        m.reply(`Error converting to PTV:\n${e.message}`);
    } finally {
        await global.loading(m, conn, true);
    }
};

handler.help = ["toptv"];
handler.tags = ["tools"];
handler.command = /^(toptv)$/i;

export default handler;
