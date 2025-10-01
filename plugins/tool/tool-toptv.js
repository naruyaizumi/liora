let handler = async (m, { conn, usedPrefix, command }) => {
    if (!m.quoted || !/video/.test(m.quoted.mimetype || ""))
        return m.reply(`🎥 *Reply video dengan perintah ${usedPrefix + command}*`);
    await global.loading(m, conn);
    try {
        let q = await m.quoted.download();
        await conn.sendFile(m.chat, q, "ptv.mp4", "", m, false, { asPTV: true });
    } catch (e) {
        console.error(e);
        m.reply("🚫 *Gagal mengubah video menjadi PTV!*");
    } finally {
        await global.loading(m, conn, true);
    }
};

handler.help = ["toptv"];
handler.tags = ["tools"];
handler.command = /^(toptv)$/i;

export default handler;
