import yts from "yt-search";

let handler = async (m, { conn, text, usedPrefix, command }) => {
    if (!text) return m.reply(`🍙 *Contoh penggunaan: ${usedPrefix + command} YAD*`);
    try {
        await global.loading(m, conn);
        let search = await yts(text);
        let videos = search.videos;
        if (!Array.isArray(videos) || videos.length === 0)
            return m.reply(`🍰 *Maaf, tidak dapat menemukan lagu dengan kata "${text}"*`);
        let video = videos[0];
        let detail = `
🍙 *Judul: ${video.title}*
🍜 *Durasi: ${video.timestamp || "-"} (${video.seconds}s)*
🍡 *Views: ${formatNumber(video.views)}*
🍰 *Channel: ${video.author.name}${video.author.verified ? " 🥇" : ""}*
🍵 *Upload: ${video.ago || "-"}*
━━━━━━━━━━━━━━━━━━━
🍱 *Pilih format unduhan di bawah ini~*
`.trim();
        await conn.sendMessage(
            m.chat,
            {
                image: { url: video.thumbnail },
                caption: detail,
                footer: "YouTube Search",
                title: "🍛 YouTube Downloader",
                interactiveButtons: [
                    {
                        name: "single_select",
                        buttonParamsJson: JSON.stringify({
                            title: "🍱 Pilih Format",
                            sections: [
                                {
                                    title: "🍙 Audio & 🍰 Video",
                                    rows: [
                                        {
                                            header: "🍙 Audio",
                                            title: "YTMP3",
                                            description: "🍩 Unduh audio MP3 kualitas terbaik",
                                            id: `.ytmp3 ${video.url}`,
                                        },
                                        {
                                            header: "🍔 Audio",
                                            title: "YTMP3 v2",
                                            description:
                                                "🥯 Jalur alternatif jika server utama sibuk",
                                            id: `.ytmp32 ${video.url}`,
                                        },
                                        {
                                            header: "🍡 Audio",
                                            title: "YTPLAY",
                                            description: "🍵 Cari & unduh audio via query langsung",
                                            id: `.ytplay ${text}`,
                                        },
                                        {
                                            header: "🍰 Video",
                                            title: "YTMP4",
                                            description: "🍱 Unduh video MP4 kualitas standar",
                                            id: `.ytmp4 ${video.url}`,
                                        },
                                        {
                                            header: "🧁 Video",
                                            title: "YTMP4 v2",
                                            description:
                                                "🥡 Jalur alternatif jika server utama sibuk",
                                            id: `.ytmp42 ${video.url}`,
                                        },
                                        {
                                            header: "🍡 Tambahan",
                                            title: "Cari Lirik / Info",
                                            description:
                                                "🍙 Dapatkan lirik atau info tambahan lagu",
                                            id: `.lyrics ${text}`,
                                        },
                                    ],
                                },
                            ],
                        }),
                    },
                ],
                hasMediaAttachment: false,
            },
            { quoted: m }
        );
    } catch (e) {
        console.error(e);
        m.reply("🍰 *Terjadi kesalahan saat memproses.*");
    } finally {
        await global.loading(m, conn, true);
    }
};

handler.help = ["play"];
handler.tags = ["downloader"];
handler.command = /^(play)$/i;

export default handler;

function formatNumber(num) {
    if (num >= 1000000000) return (num / 1000000000).toFixed(1).replace(/\.0$/, "") + "B";
    if (num >= 1000000) return (num / 1000000).toFixed(1).replace(/\.0$/, "") + "M";
    if (num >= 1000) return (num / 1000).toFixed(1).replace(/\.0$/, "") + "K";
    return num.toString();
}
