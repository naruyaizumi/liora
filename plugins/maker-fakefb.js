let handler = async (m, { conn, text, usedPrefix, command }) => {
    try {
        await global.loading(m, conn);
        
        if (!text) {
            return m.reply(`*🍂Format salah!*\n*🍀Contoh: ${usedPrefix + command} Nama|Komentar|LinkFoto*`);
        }
        
        let parts = text.split('|');
        if (parts.length < 2) {
            return m.reply(`*🍂Format salah!*\n*🌿Contoh: ${usedPrefix + command} Nama|Komentar|LinkFoto*`);
        }
        
        let name = parts[0];
        let comment = parts[1];
        let ppurl = parts[2] || '';
        
        const apiUrl = `https://api.zenzxz.my.id/maker/fakefb?name=${encodeURIComponent(name)}&comment=${encodeURIComponent(comment)}&ppurl=${encodeURIComponent(ppurl)}`;
        
        await conn.sendFile(m.chat, apiUrl, 'fakefb.jpg', `*✨Facebook Comment Maker Berhasil Dibuat!*\n\n*👤Nama: ${name}*\n*💬Komentar: ${comment}*`, m);
        
    } catch (error) {
        console.error(error);
        m.reply('*🍂Gagal membuat komentar Facebook!*');
    } finally {
        await global.loading(m, conn, true);
    }
};

handler.help = ['fakefb'];
handler.command = /^(fakefb|fakefacebook)$/i;
handler.tags = ['maker'];
handler.limit = true;
handler.register = true;

export default handler;