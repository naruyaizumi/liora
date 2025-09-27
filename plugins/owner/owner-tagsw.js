let handler = async (m, { conn, text }) => {
    try {
        let q = m.quoted ? m.quoted : m;
        let mime = (q.msg || q).mimetype || "";
        let content = {};
        let groups = Object.keys(conn.chats)
            .filter((jid) => jid.endsWith("@g.us"))
            .slice(0, 5);
        if (!groups.length) return m.reply("🥐 *Bot tidak ada di grup manapun~*");
        if (mime) {
            let file = await conn.downloadM(
                q,
                /image/.test(mime)
                    ? "image"
                    : /video/.test(mime)
                      ? "video"
                      : /audio/.test(mime)
                        ? "audio"
                        : "",
                true
            );
            if (!file) return m.reply("🥐 *Gagal unduh media!*");
            if (/image/.test(mime)) {
                content.image = { url: file };
                if (text) content.caption = text;
            } else if (/video/.test(mime)) {
                content.video = { url: file };
                if (text) content.caption = text;
            } else if (/audio/.test(mime)) {
                content.audio = { url: file };
                content.mimetype = mime;
                content.ptt = true;
            } else return m.reply("🍜 *Jenis file belum didukung~*");
        } else {
            if (!text) return m.reply("🍩 *Kirim teks dong sayang~*");
            content.text = text;
        }
        await conn.sendStatusMentions(content, groups);
        m.reply(`🍕 *Status mention berhasil dikirim ke ${groups.length} grup* 🧃`);
    } catch (e) {
        console.error(e);
        m.reply("🍔 *Gagal mengirim status mentions!*\n" + e.message);
    }
};

handler.help = ["tagsw"];
handler.tags = ["owner"];
handler.command = /^(tagsw)$/i;
handler.owner = true;

export default handler;
