let handler = async (m, { conn, args }) => {
    if (!args[0]) return m.reply("⚠️ *Masukkan URL YouTube yang valid!*");
    let url = args[0];
    let youtubeRegex =
        /^(https?:\/\/)?(www\.)?(youtube\.com\/(watch\?v=|shorts\/|live\/)|youtu\.be\/)[\w-]+(\S+)?$/i;
    if (!youtubeRegex.test(url))
        return m.reply("❌ *URL tidak valid! Harap masukkan link YouTube yang benar.*");
    try {
        await global.loading(m, conn);
        let response = await fetch(global.API("btz", "/api/download/yt", { url }, "apikey"));
        if (!response.ok) return m.reply("💔 *Gagal menghubungi API. Coba lagi nanti ya!*");
        let json = await response.json();
        if (!json.status || !json.result || !json.result.mp4) {
            return m.reply("❌ *Gagal memproses permintaan!*\n*Pastikan URL benar dan coba lagi.*");
        }
        let { title, mp4 } = json.result;
        await conn.sendFile(
            m.chat,
            mp4,
            `${title}.mp4`,
            `🎬 *Berikut adalah video yang berhasil diunduh!*\n📌 *Judul: ${title}*`,
            m,
            false,
            { mimetype: "video/mp4" }
        );
    } catch (e) {
        console.error(e);
        return m.reply("❌ *Terjadi kesalahan saat memproses permintaan.*");
    } finally {
        await global.loading(m, conn, true);
    }
};

handler.help = ["ytmp42"];
handler.tags = ["downloader"];
handler.command = /^(ytmp42)$/i;

export default handler;
