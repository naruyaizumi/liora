let handler = async (m, { conn, args }) => {
    if (!args[0]) return m.reply("🍩 *Masukkan URL MediaFire!*");
    let url = args[0];
    if (!/^https:\/\/www\.mediafire\.com\/file\//i.test(url))
        return m.reply("🍬 *URL tidak valid! Pastikan itu link MediaFire yang benar ya~*");
    try {
        await global.loading(m, conn);
        let response = await fetch(global.API("btz", "/api/download/mediafire", { url }, "apikey"));
        if (!response.ok) return m.reply("🍜 *Gagal menghubungi API. Coba lagi nanti ya!*");
        let json = await response.json();
        if (!json.status || !json.result || !json.result.download_url)
            return m.reply("🍡 *Gagal mendapatkan file. Pastikan URL benar dan coba lagi!*");
        let { filename, filesize, mimetype, uploaded, download_url } = json.result;
        let text = `
🍙 *MediaFire Downloader* 🍙
━━━━━━━━━━━━━━━━━━━
🍘 *Nama File: ${filename}*
🍱 *Ukuran File: ${filesize}*
🍛 *Tanggal Upload: ${uploaded}*
🥟 *MIME Type: ${mimetype || "-"}*
━━━━━━━━━━━━━━━━━━━
`.trim();
        await conn.sendFile(m.chat, download_url, filename, text, m, false, {
            mimetype: mimetype || "application/octet-stream",
        });
    } catch (e) {
        console.error(e);
        m.reply("🍤 *Terjadi kesalahan saat memproses permintaan!*");
    } finally {
        await global.loading(m, conn, true);
    }
};

handler.help = ["mediafire"];
handler.tags = ["downloader"];
handler.command = /^(mediafire|mf)$/i;

export default handler;
