let handler = async (m, { conn, args }) => {
    if (!args[0]) return m.reply("🍡 *Masukkan URL Pinterest yang valid!*");
    let url = args[0];
    try {
        await global.loading(m, conn);
        let response = await fetch(global.API("btz", "/api/download/pinterest", { url }, "apikey"));
        if (!response.ok) return m.reply("🍜 *Gagal menghubungi API. Coba lagi nanti ya!*");
        let json = await response.json();
        if (!json.result || !json.result.data) {
            return m.reply(
                "🍩 *Gagal memproses permintaan!*\n🍰 *Pastikan URL benar dan coba lagi.*"
            );
        }
        let { media_type, image, video } = json.result.data;
        if (media_type === "image" && image) {
            await conn.sendFile(
                m.chat,
                image,
                "pinterest.jpg",
                "🍙 *Pinterest Downloader (Image)*",
                m
            );
        } else if (media_type.startsWith("video") && video) {
            await conn.sendFile(
                m.chat,
                video,
                "pinterest.mp4",
                "🍙 *Pinterest Downloader (Video)*",
                m
            );
        } else {
            return m.reply("🍡 *Tidak ada media yang bisa diunduh dari URL ini.*");
        }
    } catch (e) {
        console.error(e);
        return m.reply("🍩 *Terjadi kesalahan saat memproses permintaan.*");
    } finally {
        await global.loading(m, conn, true);
    }
};

handler.help = ["pinterestdl"];
handler.tags = ["downloader"];
handler.command = /^(pindl|pinterestdl)$/i;

export default handler;
