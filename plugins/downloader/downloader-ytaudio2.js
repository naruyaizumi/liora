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
        if (!json.status || !json.result || !json.result.mp3) {
            return m.reply("❌ *Gagal memproses permintaan!*\n*Pastikan URL benar dan coba lagi.*");
        }
        let { title, thumb, mp3 } = json.result;
        await conn.sendFile(m.chat, mp3, `${title}.mp3`, "", m, true, {
            mimetype: "audio/mpeg",
            contextInfo: {
                externalAdReply: {
                    title: title,
                    body: "🍣 YouTube Music",
                    mediaUrl: url,
                    mediaType: 2,
                    thumbnailUrl: thumb,
                    renderLargerThumbnail: true,
                },
            },
        });
    } catch (e) {
        console.error(e);
        return m.reply("❌ *Terjadi kesalahan saat memproses permintaan.*");
    } finally {
        await global.loading(m, conn, true);
    }
};

handler.help = ["ytmp32"];
handler.tags = ["downloader"];
handler.command = /^(ytmp32)$/i;

export default handler;
