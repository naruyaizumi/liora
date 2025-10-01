let handler = async (m, { conn, args, usedPrefix, command }) => {
    if (!args[0])
        return m.reply(
            `🍩 *Masukkan link Google Drive!* \n\n🍰 *Contoh: ${usedPrefix + command} https://drive.google.com/file*`
        );
    let url = args[0];
    if (!/^https?:\/\/(drive\.google\.com|docs\.google\.com)\//i.test(url)) {
        return m.reply("🍪 *URL tidak valid! Harap gunakan link Google Drive yang benar.*");
    }
    try {
        await global.loading(m, conn);
        let apiUrl = global.API("btz", "/api/download/gdrive", { url }, "apikey");
        let res = await fetch(apiUrl);
        if (!res.ok) throw new Error(`🍡 Gagal mengambil data! Status: ${res.status}`);
        let json = await res.json();
        if (!json.status || !json.result?.data)
            return m.reply("🍙 *Gagal memproses link Google Drive.*");
        let { data, fileName, fileSize, mimetype } = json.result;
        let caption = `
🍜 *Google Drive Downloader*
━━━━━━━━━━━━━━━━━━━
🍩 *Nama File: ${fileName}*
🍰 *Ukuran: ${fileSize}*
🍪 *MIME Type: ${mimetype || "Tidak diketahui"}*
━━━━━━━━━━━━━━━━━━━
`.trim();
        await conn.sendFile(m.chat, data, fileName, caption, m, false, {
            mimetype: mimetype || "application/octet-stream",
        });
    } catch (e) {
        console.error(e);
        m.reply(`🍬 *Terjadi kesalahan:* ${e.message}`);
    } finally {
        await global.loading(m, conn, true);
    }
};

handler.help = ["gdrive"];
handler.tags = ["downloader"];
handler.command = /^(gdrive|gdrivedl)$/i;

export default handler;
