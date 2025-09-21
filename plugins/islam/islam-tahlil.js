let handler = async (m, { conn }) => {
    await global.loading(m, conn);
    try {
        let res = await fetch(global.API("btz", "/api/muslim/tahlil", {}, "apikey"));
        if (!res.ok) throw new Error("🍙 Gagal mengambil data dari API!");
        let json = await res.json();
        if (!json.result || !json.result.data) return m.reply("🍤 *Data Tahlil tidak ditemukan!*");
        let based = json.result.based_on;
        let teks = `🍚 *Bacaan Tahlil Lengkap*  
📖 *Berdasarkan: ${based}*
`;
        for (let item of json.result.data) {
            teks += `
🍩 *${item.title}*
--------------------
📜 *Arab:*  
*${item.arabic}*
`;
        }
        await conn.sendMessage(m.chat, { text: teks.trim() }, { quoted: m });
    } catch (e) {
        console.error(e);
        m.reply("🍢 *Terjadi kesalahan saat mengambil data Tahlil.*");
    } finally {
        await global.loading(m, conn, true);
    }
};

handler.help = ["tahlil"];
handler.tags = ["islam"];
handler.command = /^(tahlil)$/i;

export default handler;
