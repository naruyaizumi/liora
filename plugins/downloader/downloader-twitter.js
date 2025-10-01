let handler = async (m, { conn, args }) => {
    if (!args[0]) return m.reply("🍙 *Masukkan URL Twitter/X yang valid!*");
    let url = args[0];
    try {
        await global.loading(m, conn);
        let response = await fetch(global.API("btz", "/api/download/twitter2", { url }, "apikey"));
        if (!response.ok) return m.reply("🍤 *Gagal menghubungi API. Coba lagi nanti ya!*");
        let json = await response.json();
        if (!json.status || !json.result || !json.result.media_extended) {
            return m.reply(
                "🍡 *Gagal memproses permintaan!*\n🍜 *Pastikan URL benar dan coba lagi.*"
            );
        }
        let { user_name, user_screen_name, text, likes, retweets, replies, date, media_extended } =
            json.result;
        let caption = `🍱 *Twitter/X Downloader*  
🍙 *${user_name} (@${user_screen_name})*
🍜 *${formatDateID(date)}*
🍩 ${text || "-"}
━━━━━━━━━━━━━━━━━━━
🍰 *Likes: ${formatNumber(likes)}*
🍡 *Retweets: ${formatNumber(retweets)}*
🥟 *Replies: ${formatNumber(replies)}*`;
        for (let media of media_extended) {
            if (media.type === "image") {
                await conn.sendFile(m.chat, media.url, "image.jpg", caption, m);
            } else if (media.type.startsWith("video")) {
                await conn.sendFile(m.chat, media.url, "video.mp4", caption, m);
            } else {
                await m.reply("🥠 *Media tidak dikenali.*");
            }
        }
    } catch (e) {
        console.error(e);
        return m.reply("🍙 *Terjadi kesalahan saat memproses permintaan.*");
    } finally {
        await global.loading(m, conn, true);
    }
};

handler.help = ["twitter"];
handler.tags = ["downloader"];
handler.command = /^(twitter|twdl)$/i;

export default handler;

function formatNumber(num) {
    if (num >= 1e9) return (num / 1e9).toFixed(1).replace(/\.0$/, "") + "B";
    if (num >= 1e6) return (num / 1e6).toFixed(1).replace(/\.0$/, "") + "M";
    if (num >= 1e3) return (num / 1e3).toFixed(1).replace(/\.0$/, "") + "K";
    return num.toString();
}

function formatDateID(dateStr) {
    let date = new Date(dateStr);
    return date.toLocaleString("id-ID", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
}
