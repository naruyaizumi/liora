let handler = async (m, { conn }) => {
    try {
        let newCode = await conn.groupRevokeInvite(m.chat);
        let newLink = `https://chat.whatsapp.com/${newCode}`;

        await m.reply(`🍓 *Link undangan grup berhasil di-reset!*\n📋 *Link baru: ${newLink}*`);
    } catch (e) {
        console.error(e);
        m.reply("🍩 *Gagal me-reset link grup. Coba lagi nanti yaa~*");
    }
};

handler.help = ["revoke"];
handler.tags = ["group"];
handler.command = /^(revoke)$/i;
handler.group = true;
handler.botAdmin = true;
handler.admin = true;

export default handler;