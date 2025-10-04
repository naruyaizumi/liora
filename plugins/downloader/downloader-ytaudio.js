let handler = async (m, { conn, args }) => {
    if (!args[0]) return m.reply("🍙 *Masukkan URL YouTube yang valid!*");

    let url = args[0];
    let youtubeRegex = /^https?:\/\/(?:www\.|m\.)?(?:youtube\.com|youtu\.be|music\.youtube\.com)\/.+/i;
    if (!youtubeRegex.test(url))
        return m.reply("🍤 *URL tidak valid! Harap masukkan link YouTube/YouTube Music yang benar.*");

    await global.loading(m, conn);
    try {
        const apiUrl = `https://api.nekolabs.my.id/downloader/youtube/v1?url=${url}&format=mp3`;
        const res = await fetch(apiUrl);
        if (!res.ok) throw new Error("Gagal menghubungi API.");

        const json = await res.json();
        if (!json.status || !json.result?.downloadUrl) {
            throw new Error("Konten tidak bisa diproses.");
        }

        const { title, cover, downloadUrl, duration } = json.result;

        await conn.sendMessage(m.chat, {
            audio: { url: downloadUrl },
            mimetype: "audio/mpeg",
            fileName: `${title}.mp3`,
            contextInfo: {
                externalAdReply: {
                    title: title,
                    body: `🍣 YouTube Music • ${duration}`,
                    thumbnailUrl: cover,
                    mediaType: 1,
                    renderLargerThumbnail: true,
                },
            },
        }, { quoted: m });
    } catch (e) {
        console.error(e);
        await m.reply(`🍩 *Terjadi kesalahan:* ${e.message}`);
    } finally {
        await global.loading(m, conn, true);
    }
};

handler.help = ["ytmp3"];
handler.tags = ["downloader"];
handler.command = /^(ytmp3)$/i;

export default handler;