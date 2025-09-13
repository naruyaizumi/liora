import { uploader } from '../lib/uploader.js';

let handler = async (m, { conn, args, usedPrefix, command }) => {
    await global.loading(m, conn);
    try {
        if (!args[0]) {
            return m.reply(
                `🍬 *Masukkan nama dan durasi untuk fakecall! (pakai |)*\n\n✨ *Contoh: ${usedPrefix + command} Nama|Durasi*`
            );
        }

        let q = m.quoted ? m.quoted : m;
        let mime = (q.msg || q).mimetype || '';
        if (!mime || !/image\/(jpeg|png)/.test(mime)) {
            return m.reply('🍡 *Balas gambar JPG/PNG atau kirim gambar dengan caption perintahnya!*');
        }

        let media = await q.download();
        let up = await uploader(media).catch(() => null);
        if (!up) return m.reply('⚠️ *Gagal mengunggah ke server. Coba lagi nanti yaa!*');

        let [nama, durasi] = args.join(' ').split('|');
        if (!nama || !durasi) {
            return m.reply(
                `🍬 *Format salah!*\n\n✨ *Contoh: ${usedPrefix + command} Nama|Durasi*`
            );
        }

        let apiUrl = `https://api.zenzxz.my.id/maker/fakecall?nama=${encodeURIComponent(
            nama
        )}&durasi=${encodeURIComponent(durasi)}&avatar=${encodeURIComponent(up)}`;
        let buffer = Buffer.from(await (await fetch(apiUrl)).arrayBuffer());

        await conn.sendFile(
            m.chat,
            buffer,
            'fakecall.jpg',
            `*✨ Fake Call Maker Berhasil Dibuat!*\n\n*👤 Nama: ${nama}*\n*⏰ Durasi: ${durasi} detik*`,
            m
        );
    } catch (e) {
        console.error(e);
        m.reply('🍓 *Yaaah, gagal buat fakecall-nya!*');
    } finally {
        await global.loading(m, conn, true);
    }
};

handler.help = ['fakecall'];
handler.tags = ['maker'];
handler.command = /^fakecall$/i;
handler.limit = true;
handler.register = true;

export default handler;