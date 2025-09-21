let handler = async (m, { conn, args, usedPrefix, command }) => {
    if (!args[0])
        return m.reply(`🍡 *Contoh penggunaan: ${usedPrefix + command} Ini deskripsi baru~*`);
    try {
        await conn.groupUpdateDescription(m.chat, args.join(" "));
    } catch (e) {
        console.error(e);
        m.reply("🍬 *Gagal mengubah deskripsi grup.*");
    }
};

handler.help = ["setdesc"];
handler.tags = ["group"];
handler.command = /^(setdesc|setdesk)$/i;
handler.group = true;
handler.botAdmin = true;
handler.admin = true;

export default handler;
