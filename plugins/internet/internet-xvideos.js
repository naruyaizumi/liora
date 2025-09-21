let handler = async (m, { conn, text, usedPrefix, command }) => {
    if (!text)
        return m.reply(
            `🍔 *Masukkan kata kunci untuk mencari video Xvideos!*\n\n🍱 *Contoh: ${usedPrefix + command} japanese* 🍣\n\n⚠️ *WARNING: This feature contains 18+ NSFW content*`
        );
    await global.loading(m, conn);
    try {
        let res = await fetch(global.API("btz", "/api/search/xvideos", { query: text }, "apikey"));
        let json = await res.json();
        if (!json.result || json.result.length === 0)
            return m.reply("🍟 *Tidak ada video ditemukan!*");
        let sections = [
            {
                title: `🍜 Hasil Pencarian: ${text}`,
                rows: json.result.slice(0, 10).map((v, i) => ({
                    title: v.title,
                    header: `🥠 Durasi: ${v.duration || "-"}`,
                    description: `🍤 Tekan untuk unduh (${i + 1})`,
                    id: `.xviddl ${v.url}`,
                })),
            },
        ];
        await conn.sendMessage(
            m.chat,
            {
                image: { url: json.result[0].thumb },
                caption: `🍙 *Ditemukan ${json.result.length} video Xvideos untuk: ${text}*\n⚠️ *WARNING: This feature contains 18+ NSFW content*\n🍩 *Note: Video hasil unduhan akan dikirim langsung ke private chat kamu.*`,
                footer: "🍡 Gunakan dengan bijak ya!",
                title: "🍕 Xvideos Downloader",
                interactiveButtons: [
                    {
                        name: "single_select",
                        buttonParamsJson: JSON.stringify({
                            title: "🍱 Pilih Video",
                            sections,
                        }),
                    },
                ],
            },
            { quoted: m }
        );
    } catch (e) {
        console.error(e);
        m.reply("🍧 *Terjadi kesalahan saat mengambil data dari Xvideos!*");
    } finally {
        await global.loading(m, conn, true);
    }
};

handler.help = ["xvideos"];
handler.tags = ["internet"];
handler.command = /^(xvideos)$/i;
handler.premium = true;

export default handler;
