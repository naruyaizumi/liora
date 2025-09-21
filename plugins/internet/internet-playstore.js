let handler = async (m, { conn, args, usedPrefix, command }) => {
    if (!args[0])
        return m.reply(
            `🍔 *Masukkan nama aplikasi yang ingin dicari di Play Store!*\n\n🍟 *Contoh:* ${usedPrefix + command} WhatsApp`
        );
    await global.loading(m, conn);
    try {
        let query = args.join(" ");
        let res = await fetch(global.API("btz", "/api/search/playstore", { app: query }, "apikey"));
        if (!res.ok) throw "🍕 *Gagal mengakses API Play Store.*";
        let json = await res.json();
        let result = json.result;
        if (!result || !Array.isArray(result) || result.length === 0)
            return m.reply("🍩 *Tidak ditemukan aplikasi yang cocok.*");
        let cards = [];
        for (let item of result.slice(0, 10)) {
            cards.push({
                image: { url: item.img },
                title: `🍱 ${item.title}`,
                body: `🍤 Developer: ${item.developer}\n🍜 Harga: ${item.price}\n⭐ Rating: ${item.rating}`,
                footer: `🍣 ${item.link}`,
                buttons: [
                    {
                        name: "cta_url",
                        buttonParamsJson: JSON.stringify({
                            display_text: "🥠 Kunjungi Play Store",
                            url: item.link,
                            merchant_url: item.link_dev,
                        }),
                    },
                ],
            });
        }
        await conn.sendMessage(
            m.chat,
            {
                text: `🍙 *Hasil Pencarian Play Store: ${query}*`,
                title: `🍛 Play Store Search`,
                subtitle: "",
                footer: "🍬 Klik tombol untuk selengkapnya",
                cards,
            },
            { quoted: m }
        );
    } catch (e) {
        console.error(e);
        m.reply("🍨 *Terjadi kesalahan saat mengambil data dari Play Store.*");
    } finally {
        await global.loading(m, conn, true);
    }
};

handler.help = ["playstore"];
handler.tags = ["internet"];
handler.command = /^(playstore)$/i;

export default handler;
