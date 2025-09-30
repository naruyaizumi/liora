let handler = async (m, { conn, args }) => {
    let text = args.join(" ");
    if (!text) return m.reply("🍙 *Masukkan kata kunci pencarian grup!*");
    await global.loading(m, conn);
    try {
        let res = await fetch(
            global.API("btz", "/api/search/linkgroupwa", { text1: text }, "apikey")
        );
        if (!res.ok) throw "🍜 *Gagal mengambil data dari API!*";
        let json = await res.json();
        if (!json.result || !json.result.length) throw "🍡 *Tidak ditemukan grup yang sesuai!*";
        let first = json.result[0];
        let others =
            json.result
                .slice(1, 10)
                .map((v) => `🍱 *${v.title}*\n🔗 ${v.link}`)
                .join("\n\n") || "🍵 Tidak ada grup lain.";
        await conn.sendMessage(
            m.chat,
            {
                text: `
🍓 *Hasil Pencarian Grup: ${text}*
━━━━━━━━━━━━━━━━━━━
🍰 *Judul: ${first.title}*
🍬 *Deskripsi: ${first.desc || "-"}*
🍭 *Link: ${first.link}*

🧁 *Rekomendasi Grup Lainnya:*
${others}
`.trim(),
                contextInfo: {
                    externalAdReply: {
                        title: first.title,
                        body: "🔍 Hasil pencarian grup WhatsApp",
                        thumbnailUrl: first.thumb,
                        mediaType: 1,
                        sourceUrl: first.link,
                        renderLargerThumbnail: true,
                    },
                },
            },
            { quoted: m }
        );
    } catch (e) {
        console.error(e);
        m.reply(typeof e === "string" ? e : "🍩 *Terjadi kesalahan tak terduga.*");
    } finally {
        await global.loading(m, conn, true);
    }
};

handler.help = ["gcwa"];
handler.tags = ["internet"];
handler.command = /^((group(wa)?|gcwa)(-link)?)$/i;

export default handler;
