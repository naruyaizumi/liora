let handler = async (m, { conn, args }) => {
    if (!args[0] || !args[0].startsWith("http"))
        return m.reply("🍙 *Berikan link lagu Spotify yang valid ya~!*");
    await global.loading(m, conn);
    try {
        let res = await fetch(
            global.API("btz", "/api/download/spotify", { url: args[0] }, "apikey")
        );
        let json = await res.json();
        if (!json.status || !json.result?.data?.url)
            return m.reply("🍤 *Gagal mengunduh lagu dari Spotify!*");
        let { title, artist, thumbnail, url } = json.result.data;
        await conn.sendFile(m.chat, url, `${title}.mp3`, "", m, true, {
            mimetype: "audio/mpeg",
            contextInfo: {
                externalAdReply: {
                    title: title,
                    body: artist?.name || "Spotify",
                    thumbnailUrl: thumbnail,
                    mediaUrl: args[0],
                    mediaType: 1,
                    renderLargerThumbnail: true,
                },
            },
        });
    } catch (e) {
        console.error(e);
        m.reply("🍩 *Terjadi kesalahan saat mengunduh lagu Spotify!*");
    } finally {
        await global.loading(m, conn, true);
    }
};

handler.help = ["spotifydl"];
handler.tags = ["downloader"];
handler.command = /^(spotifydl|spdl)$/i;

export default handler;
