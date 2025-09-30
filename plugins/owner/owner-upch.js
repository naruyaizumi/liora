let handler = async (m, { conn, text }) => {
    try {
        let q = m.quoted ? m.quoted : m;
        let mime = (q.msg || q).mimetype || "";

        if (/image|video|audio/.test(mime)) {
            m.reply("🍱 *Sedang memproses media...*");

            let type = /image/.test(mime) ? "image" : /video/.test(mime) ? "video" : "audio";

            let media = await conn.downloadM(q, type, true);

            await conn.sendFile(
                "120363417411850319@newsletter",
                media,
                "",
                text || "",
                null,
                /audio/.test(mime),
                { mimetype: mime }
            );
        } else if (text) {
            await conn.sendMessage("120363417411850319@newsletter", { text });
        } else {
            return m.reply("🍙 *Harap reply gambar, video, audio, atau ketik teks!*");
        }

        m.reply("🍤 *Pesan berhasil dikirim ke channel!*");
    } catch (e) {
        console.error(e);
        m.reply("🍢 *Terjadi kesalahan saat mengirim pesan ke channel!*");
    }
};

handler.help = ["upch"];
handler.tags = ["owner"];
handler.command = /^(ch|upch)$/i;
handler.owner = true;

export default handler;
