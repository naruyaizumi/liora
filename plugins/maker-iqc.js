let handler = async (m, { conn, text, usedPrefix, command }) => {
    try {
        await global.loading(m, conn);
        if (!text) return m.reply(`*🍫 Masukkan teks!*\n*Contoh: ${usedPrefix + command} Konichiwa|06:00|Izumi*`);
        
        let parts = text.split('|');
        if (parts.length < 3) return m.reply(`*❗ Format salah!*\n*🎐 Contoh: ${usedPrefix + command} Teks|WaktuChat|StatusBar*`);
        
        let [message, chatTime, statusBarTime] = parts;
        
        if (message.length > 80) return m.reply('*🍪 Teks terlalu panjang! Maksimal 80 karakter.*');        

        let url = `https://api.zenzxz.my.id/maker/fakechatiphone?text=${encodeURIComponent(message)}&chatime=${encodeURIComponent(chatTime)}&statusbartime=${encodeURIComponent(statusBarTime)}`;
        
        const response = await fetch(url);
        if (!response.ok) throw new Error('Gagal mengambil gambar dari API');
        
        const buffer = await response.arrayBuffer();
        const imageBuffer = Buffer.from(buffer);
        
        await conn.sendFile(m.chat, imageBuffer, 'fakechat.jpg', `*✨ Fake Chat iPhone Berhasil Dibuat!*\n\n*💬 Pesan: ${message}*\n*⏰ Waktu Chat: ${chatTime}*\n*📱 Status Bar: ${statusBarTime}*`, m);
        
    } catch (err) {
        console.error(err);
        await m.reply('*🍂 Gagal membuat gambar. Coba lagi nanti.*');
    } finally {
        await global.loading(m, conn, true);
    }
};

handler.help = ['iqc'];
handler.tags = ['maker'];
handler.command = /^(iqc|fakeiphonechat)$/i;
handler.limit = true;
handler.register = true;

export default handler;