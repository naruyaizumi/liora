let handler = async (m, { conn, text }) => {
    try {
        const q = m.quoted ? m.quoted : m;
        const mime = q.mimetype || "";

        await global.loading(m, conn);

        const jid = "120363417411850319@newsletter";
        const caption = text ? text.trim() : "";

        if (/image|video|audio/.test(mime)) {
            const media = await q.download();
            if (!Buffer.isBuffer(media)) throw new Error("Invalid media buffer");

            const message = /audio/.test(mime)
                ? { audio: media, mimetype: mime, ptt: true, caption }
                : /video/.test(mime)
                  ? { video: media, mimetype: mime, caption }
                  : { image: media, mimetype: mime, caption };

            await conn.sendMessage(jid, message, { quoted: m });
        } else if (text) {
            await conn.sendMessage(jid, { text }, { quoted: m });
        } else {
            return m.reply("Provide media or text to send.");
        }

        await m.reply("Message successfully sent to channel.");
    } catch (e) {
        conn.logger.error(e);
        m.reply(`Error: ${e.message}`);
    } finally {
        await global.loading(m, conn, true);
    }
};

handler.help = ["upch"];
handler.tags = ["owner"];
handler.command = /^(ch|upch)$/i;
handler.owner = true;

export default handler;
