let handler = async (m, { conn, text, args, usedPrefix, command }) => {
    let url = text || args[0];
    if (!url || !/^https?:\/\/(www\.)?threads\.com\//i.test(url)) {
        return m.reply(
            `🍩 *Link Threads tidak valid!*\n\n🍰 *Contoh: ${usedPrefix + command} https://www.threads.com/@user/post/xxxxx*`
        );
    }
    try {
        await global.loading(m, conn);
        let res = await fetch(global.API("btz", "/api/download/threads", { url }, "apikey"));
        if (!res.ok) throw new Error(`🍪 Gagal mengambil data! Status ${res.status}`);
        let json = await res.json();
        if (!json.status || !json.result) return m.reply("🍬 *Gagal mendapatkan konten Threads.*");
        let { image_urls, video_urls } = json.result;
        if (Array.isArray(video_urls) && video_urls.length) {
            let video = video_urls[0]?.download_url || video_urls[0];
            await conn.sendFile(
                m.chat,
                video,
                "threads.mp4",
                `🍱 *Video Threads berhasil diunduh!*`,
                m,
                false,
                { mimetype: "video/mp4" }
            );
            return;
        }
        if (Array.isArray(image_urls) && image_urls.length) {
            for (let img of image_urls) {
                if (!img) continue;
                await conn.sendFile(
                    m.chat,
                    img,
                    "threads.jpg",
                    "🍡 *Gambar Threads berhasil diunduh!*",
                    m
                );
            }
            return;
        }
        m.reply("🍙 *Konten tidak ditemukan. Coba kirim link lain.*");
    } catch (err) {
        console.error(err);
        m.reply(`🍜 *Terjadi kesalahan:*\n${err.message}`);
    } finally {
        await global.loading(m, conn, true);
    }
};

handler.help = ["threads"];
handler.tags = ["downloader"];
handler.command = /^(threads)$/i;

export default handler;
