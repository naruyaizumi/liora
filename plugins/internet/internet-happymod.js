let handler = async (m, { conn, args, usedPrefix, command }) => {
    if (!args[0])
        return m.reply(
            `🍔 *Masukkan nama game atau aplikasi untuk dicari di HappyMod!*\n🍟 *Contoh: ${usedPrefix + command} Minecraft*`
        );
    await global.loading(m, conn);
    try {
        let query = args.join(" ");
        let apiUrl = global.API("btz", "/api/search/happymod", { query }, "apikey");
        let res = await fetch(apiUrl);
        let json = await res.json();
        if (!json.status || !json.result || json.result.length === 0)
            return m.reply("🍩 *Tidak ditemukan hasil apapun. Coba kata kunci lain!*");
        let results = json.result.slice(0, 10);
        let cards = [];
        for (let app of results) {
            cards.push({
                image: { url: app.icon },
                title: `🍱 ${app.title}`,
                body: `🍤 Versi: ${app.version}\n🍜 Ukuran: ${app.size}`,
                footer: `🍣 ${app.link}`,
                buttons: [
                    {
                        name: "cta_url",
                        buttonParamsJson: JSON.stringify({
                            display_text: "🥠 Kunjungi Halaman",
                            url: app.link,
                            merchant_url: app.link,
                        }),
                    },
                ],
            });
        }
        await conn.sendMessage(
            m.chat,
            {
                text: `🍙 *Hasil Pencarian HappyMod: ${query}*`,
                title: "🍛 HappyMod Search",
                subtitle: "",
                footer: "🍬 Klik tombol untuk selengkapnya",
                cards,
            },
            { quoted: m }
        );
    } catch (e) {
        console.error(e);
        m.reply("🍨 *Terjadi kesalahan saat memuat hasil HappyMod.*");
    } finally {
        await global.loading(m, conn, true);
    }
};

handler.help = ["happymod"];
handler.tags = ["internet"];
handler.command = /^(happymod)$/i;

export default handler;
