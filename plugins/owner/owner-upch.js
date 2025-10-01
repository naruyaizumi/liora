let handler = async (m, { conn, text }) => {
    try {
        let q = m.quoted ? m.quoted : m;
        let mime = (q.msg || q).mimetype || "";

        if (/image|video|audio/.test(mime)) {
            await global.loading(m, conn);

            let type = /image/.test(mime) ? "image" : /video/.test(mime) ? "video" : "audio";
            let media = await conn.downloadM(q, type, true);

            await conn.sendFile(
                global.config.newsletter,
                media,
                "",
                text || "",
                null,
                /audio/.test(mime),
                { mimetype: mime }
            );
        } else if (text) {
            await global.loading(m, conn);
            await conn.sendMessage(global.config.newsletter, { text });
        } else {
            return m.reply("🍙 *Harap reply gambar, video, audio, atau ketik teks!*");
        }

        m.reply("🍤 *Pesan berhasil dikirim ke channel!*");
    } catch (e) {
        console.error(e);
        m.reply("🍢 *Terjadi kesalahan saat mengirim pesan ke channel!*");
    } finally {
        await global.loading(m, conn, true);
    }
};

handler.help = ["upch"];
handler.tags = ["owner"];
handler.command = /^(ch|upch)$/i;
handler.owner = true;

export default handler;