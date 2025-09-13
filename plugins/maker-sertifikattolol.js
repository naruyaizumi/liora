
let handler = async (m, { conn, args, usedPrefix, command }) => {
    try {
        await global.loading(m, conn);
        
        if (!args.length) {
            return m.reply(`*⚠️ FORMAT PENGGUNAAN*\n\n*Gunakan: ${usedPrefix + command} <nama>*\n\n*🧩 Contoh:*\n*${usedPrefix + command} Kamu*`);
        }

        const textInput = args.join(" ");
        const apiUrl = `https://api.siputzx.my.id/api/m/sertifikat-tolol?text=${encodeURIComponent(textInput)}`;
        
        const res = await fetch(apiUrl);
        if (!res.ok) throw new Error(`*🚨 API Error: ${res.statusText}*`);

        const buffer = await res.arrayBuffer();
        const imageBuffer = Buffer.from(buffer);

        await conn.sendMessage(m.chat, {
            image: imageBuffer,
            caption: `*🎉 SERTIFIKAT TOLOL*\n\n*📝 Nama Penerima: ${textInput}*\n*📅 Tanggal: ${new Date().toLocaleDateString('id-ID')}*`
        }, { quoted: m });

    } catch (error) {
        console.error('*❌ Error:*', error);
        await m.reply(`*❌ GAGAL MEMBUAT SERTIFIKAT*\n\nAlasan: *${error.message || 'Server overload'}*\n\nCoba lagi beberapa saat atau gunakan nama yang berbeda.`);
    } finally {
        await global.loading(m, conn, true);
    }
};

handler.help = ["sertifikattolol"];
handler.tags = ["maker"];
handler.command = /^(sertifikattolol|sertol|certitol)$/i;
handler.limit = true;
handler.register = true;

export default handler;