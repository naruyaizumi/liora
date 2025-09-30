let handler = async (m, { conn, usedPrefix, command, text }) => {
    if (!text)
        return m.reply(`🍜 *Masukan nama apk*\n\n🥡 *Contoh: ${usedPrefix + command} whatsapp*`);
    let data = await aptoide.search(text);
    if (!data.length) return m.reply("🍢 *Tidak ada hasil ditemukan!*");
    let rows = data.map((v, i) => ({
        header: `🍔 ${i + 1}. ${v.name}`,
        title: `🍛 Versi: ${v.version}`,
        description: `🍟 Size: ${v.size} | 🍙 Download: ${formatNumber(v.download)}`,
        id: `${usedPrefix}apkdl ${v.id}`,
    }));
    await conn.sendMessage(
        m.chat,
        {
            image: { url: "https://files.cloudkuimages.guru/images/9e9c94dc0838.jpg" },
            caption: `🍱 *Hasil pencarian Aptoide untuk: ${text}*`,
            footer: "📦 Aptoide Downloader",
            title: "🍜 Pilih aplikasi yang ingin diunduh",
            interactiveButtons: [
                {
                    name: "single_select",
                    buttonParamsJson: JSON.stringify({
                        title: "🍤 Daftar Aplikasi",
                        sections: [{ title: "🍣 Hasil Pencarian", rows }],
                    }),
                },
            ],
        },
        { quoted: m }
    );
};

handler.help = ["apk"];
handler.tags = ["internet"];
handler.command = /^(apk)$/i;

export default handler;

const aptoide = {
    search: async function (args) {
        let res = await global.fetch(
            `https://ws75.aptoide.com/api/7/apps/search?query=${args}&limit=30`
        );
        res = await res.json();
        return res.datalist.list.map((v) => ({
            name: v.name,
            size: v.size,
            version: v.file.vername,
            id: v.package,
            download: v.stats.downloads,
        }));
    },
    download: async function (id) {
        let res = await global.fetch(
            `https://ws75.aptoide.com/api/7/apps/search?query=${id}&limit=1`
        );
        res = await res.json();
        return {
            img: res.datalist.list[0].icon,
            developer: res.datalist.list[0].store.name,
            appname: res.datalist.list[0].name,
            link: res.datalist.list[0].file.path,
        };
    },
};

function formatNumber(num) {
    if (num >= 1000000000) return (num / 1000000000).toFixed(1).replace(/\.0$/, "") + "B";
    if (num >= 1000000) return (num / 1000000).toFixed(1).replace(/\.0$/, "") + "M";
    if (num >= 1000) return (num / 1000).toFixed(1).replace(/\.0$/, "") + "K";
    return num.toString();
}
