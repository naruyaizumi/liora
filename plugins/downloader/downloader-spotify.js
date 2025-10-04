let handler = async (m, { conn, args, usedPrefix, command }) => {
    if (!args[0]) {
        return m.reply(`🍙 *Masukkan judul lagu untuk dicari di Spotify!*\n*Contoh: ${usedPrefix + command} Swim*`);
    }

    let query = args.join(" ");
    await global.loading(m, conn);

    try {
        let res = await fetch(`https://api.nekolabs.my.id/downloader/spotify/play/v1?q=${query}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        let json = await res.json();

        if (!json.status || !json.result?.downloadUrl) {
            return m.reply("🍣 *Gagal menemukan atau mengunduh lagu dari Spotify!*");
        }

        let { title, artist, duration, cover, url } = json.result.metadata;
        let audioUrl = json.result.downloadUrl;

        await conn.sendFile(m.chat, audioUrl, `${title}.mp3`, "", m, true, {
            mimetype: "audio/mpeg",
            contextInfo: {
                externalAdReply: {
                    title: title,
                    body: `${artist} • ${duration}`,
                    thumbnailUrl: cover,
                    mediaUrl: url,
                    mediaType: 2,
                    renderLargerThumbnail: true,
                },
            },
        });
    } catch (e) {
        console.error(e);
        m.reply("🍤 *Terjadi kesalahan saat mengambil data Spotify!*");
    } finally {
        await global.loading(m, conn, true);
    }
};

handler.help = ["spotify"];
handler.tags = ["downloader"];
handler.command = /^(spotify)$/i;

export default handler;