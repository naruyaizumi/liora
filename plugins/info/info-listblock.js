let handler = async (m, { conn }) => {
    try {
        let data = await conn.fetchBlocklist();
        if (!data || !data.length) return m.reply("🍪 *Tidak ada nomor yang diblokir.*");
        let txt = `🍩 *Daftar Nomor yang Diblokir*\n\n`;
        txt += `🍰 *Total: ${data.length}*\n`;
        txt += `━━━━━━━━━━━━━━\n\n`;
        txt += data.map((i, idx) => `${idx + 1}. 🍡 @${i.split("@")[0]}`).join("\n");
        await conn.reply(m.chat, txt, m, { mentions: data });
    } catch (err) {
        console.error(err);
        m.reply("🍪 *Gagal mengambil daftar nomor yang diblokir.*");
    }
};

handler.help = ["listblock"];
handler.tags = ["info"];
handler.command = /^(listb(lo(ck|k)?)?)$/i;
handler.owner = true;

export default handler;
