const delay = (ms) => new Promise((res) => setTimeout(res, ms));

let handler = async (m, { conn, text }) => {
    try {
        let q = m.quoted ? m.quoted : m;
        let mime = (q.msg || q).mimetype || "";

        if (/image|video|audio/.test(mime)) {
            await global.loading(m, conn);

            let type = /image/.test(mime) ? "image" : /video/.test(mime) ? "video" : "audio";
            let media = await conn.downloadM(q, type, true);

            for (let jid of global.config.newsletter) {
                await conn.sendFile(jid, media, "", text || "", null, /audio/.test(mime), {
                    mimetype: mime,
                });
                await delay(2000);
            }
        } else if (text) {
            await global.loading(m, conn);
            for (let jid of global.config.newsletter) {
                await conn.sendMessage(jid, { text });
                await delay(2000);
            }
        } else {
            return m.reply("🍙 *Harap reply gambar, video, audio, atau ketik teks!*");
        }

        m.reply(
            `🍤 *Pesan berhasil dikirim ke ${global.config.newsletter.length} channel dengan jeda 2 detik.*`
        );
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
