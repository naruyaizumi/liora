let handler = async (m, { conn, usedPrefix, command, args }) => {
    if (!args[0]) {
        return m.reply(
            `🍜 *Masukkan URL TikTok yang valid!*\n🍣 *Contoh:* ${usedPrefix + command} https://vm.tiktok.com/...`
        );
    }

    const rawUrl = args[0];
    const isTikTok = /^https?:\/\/(www\.)?(vm\.|vt\.|m\.)?tiktok\.com\/.+/i.test(rawUrl);
    if (!isTikTok) return m.reply("🍩 *URL tidak valid! Harap masukkan link TikTok yang benar.*");

    const url = /^https?:\/\/vm\.tiktok\.com(\/|$)/.test(rawUrl)
        ? await resolveTikTokUrl(rawUrl)
        : rawUrl;

    try {
        await global.loading(m, conn);

        const cekSlide = await fetch(global.API("btz", "/api/download/ttslide", { url }, "apikey"));
        const cekVideo = await fetch(global.API("btz", "/api/download/tiktok", { url }, "apikey"));

        const jsonSlide = await cekSlide.json();
        const jsonVideo = await cekVideo.json();

        if (jsonSlide.status && jsonSlide.result.images?.length > 0) {
            const images = jsonSlide.result.images;
            const album = images.map((imgUrl, i) => ({
                image: { url: imgUrl },
                caption: `📸 TikTok Slide (${i + 1}/${images.length})`,
            }));

            await conn.sendMessage(m.chat, { album }, { quoted: m });

            if (jsonSlide.result.audio) {
                await conn.sendFile(
                    m.chat,
                    jsonSlide.result.audio,
                    "tiktok.mp3",
                    "",
                    m,
                    false,
                    { mimetype: "audio/mpeg" }
                );
            }
            return;
        }
        
        if (jsonVideo.status && jsonVideo.result.video?.length > 0) {
            await conn.sendFile(
                m.chat,
                jsonVideo.result.video[0],
                "tiktok.mp4",
                `🎥 *Hasil Unduhan TikTok Video* 🍛`,
                m
            );
            if (jsonVideo.result.audio?.length > 0) {
                await conn.sendFile(
                    m.chat,
                    jsonVideo.result.audio[0],
                    "tiktok.mp3",
                    "",
                    m,
                    false,
                    { mimetype: "audio/mpeg" }
                );
            }
            return;
        }

        return m.reply("💔 *Konten gak bisa diunduh. Coba link lain ya~* 🍵");
    } catch (e) {
        console.error(e);
        return m.reply(`❌ *Ada kesalahan teknis!* 🍙`);
    } finally {
        await global.loading(m, conn, true);
    }
};

handler.help = ["tiktok"];
handler.tags = ["downloader"];
handler.command = /^(tiktok|tt)$/i;

export default handler;

async function resolveTikTokUrl(rawUrl) {
    let res = await fetch(rawUrl, { method: "HEAD", redirect: "follow" });
    return res.url;
}