let handler = async (m, { conn, args, usedPrefix, command }) => {
    if (!args[0]) return m.reply(`🧁 *Contoh penggunaan: ${usedPrefix + command} Nama Grup Baru*`);
    try {
        await conn.groupUpdateSubject(m.chat, args.join(" "));
    } catch (e) {
        console.error(e);
        m.reply(
            "🍩 *Gagal mengganti nama grup, mungkin karena keterbatasan waktu atau bot bukan admin~*"
        );
    }
};

handler.help = ["setnamegc"];
handler.tags = ["group"];
handler.command = /^(setnamegc)$/i;
handler.group = true;
handler.botAdmin = true;
handler.admin = true;

export default handler;
