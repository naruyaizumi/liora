let handler = async (m, { conn, args, usedPrefix, command }) => {
    let isClose = {
        open: "not_announcement",
        close: "announcement",
    }[(args[0] || "").toLowerCase()];
    if (isClose === undefined)
        return m.reply(
            `🍰 *Format salah*\n*Gunakan salah satu dari ini:*\n🍓 *${usedPrefix + command} open (Buka grup)*\n🍓 *${usedPrefix + command} close (Tutup grup)*`.trim()
        );
    await conn.groupSettingUpdate(m.chat, isClose);
};

handler.help = ["group"];
handler.tags = ["group"];
handler.command = /^(g|group)$/i;
handler.group = true;
handler.admin = true;
handler.botAdmin = true;

export default handler;
