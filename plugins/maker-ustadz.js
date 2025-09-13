let handler = async (m, { conn, text, usedPrefix, command }) => {
    try {
        await global.loading(m, conn);
        if (!text) return m.reply(`*📖 Masukkan teks!*\n*Contoh: ${usedPrefix + command} [pertanyaan kamu]*`);
        
        if (text.length > 100) return m.reply('*🍂 Teks terlalu panjang! Maksimal 100 karakter.*');        

        let url = `https://api.zenzxz.my.id/maker/ustadz?text=${encodeURIComponent(text)}`;
        
        const response = await fetch(url);
        if (!response.ok) throw new Error('Gagal mengambil gambar dari API');
        
        const buffer = await response.arrayBuffer();
        const imageBuffer = Buffer.from(buffer);
        
        await conn.sendFile(m.chat, imageBuffer, 'ustadz.jpg', `*👳 Ustadz Quote Berhasil Dibuat!*\n\n*💬 Pesan: ${text}*`, m);
        
    } catch (err) {
        console.error(err);
        await m.reply('*🍂 Gagal membuat gambar. Coba lagi nanti.*');
    } finally {
        await global.loading(m, conn, true);
    }
};

handler.help = ['ustadz'];
handler.tags = ['maker'];
handler.command = /^(ustadz|ustad)$/i;
handler.limit = true;
handler.register = true;

export default handler;