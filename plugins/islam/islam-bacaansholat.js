let handler = async (m, { conn }) => {
    await global.loading(m, conn);
    try {
        let res = await fetch(global.API("btz", "/api/muslim/bacaanshalat", {}, "apikey"));
        let json = await res.json();
        if (!json.result || json.result.length === 0)
            return m.reply("🍙 *Data bacaan shalat tidak ditemukan!*");
        let teks = `🍱 *Kumpulan Bacaan Shalat* 🍱

`;
        for (let v of json.result) {
            teks += `
🍩 *${v.name}*
━━━━━━━━━━━━━━━━
🍜 *Arabic*:
*${v.arabic}*

🍡 *Latin*:
*${v.latin}*

🍤 *Terjemahan*:
${v.terjemahan}
`;
        }
        await conn.sendMessage(m.chat, { text: teks.trim() }, { quoted: m });
    } catch (e) {
        console.error(e);
        m.reply("🍔 *Gagal mengambil data bacaan shalat!*");
    } finally {
        await global.loading(m, conn, true);
    }
};

handler.help = ["bacaanshalat"];
handler.tags = ["islam"];
handler.command = /^(bacaanshalat)$/i;

export default handler;
