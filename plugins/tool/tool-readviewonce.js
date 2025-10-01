let handler = async (m, { conn }) => {
    let q = m.quoted ? m.quoted : m;
    try {
        let media = await q.download?.();
        await conn.sendFile(m.chat, media, null, q.text || "", m);
    } catch {
        m.reply("🍥 *Media gagal dimuat kak!*");
    }
};

handler.help = ["readviewonce"];
handler.tags = ["tools"];
handler.command = /^(read(view(once)?)?|rvo)$/i;

export default handler;
