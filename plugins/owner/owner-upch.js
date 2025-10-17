let handler = async (m, { conn, text }) => {
    try {
        const q = m.quoted ? m.quoted : m;
        const mime = q.mimetype || "";

        await global.loading(m, conn);
        if (/image|video|audio/.test(mime)) {
            const media = await q.download();
            if (!Buffer.isBuffer(media)) throw new Error("Invalid media buffer");
            const caption = text ? text.trim() : "";
            await conn.sendFile(
                "120363417411850319@newsletter",
                media,
                "upload",
                caption,
                m,
                /audio/.test(mime),
                { mimetype: mime }
            );
        } else if (text) {
            await conn.sendMessage("120363417411850319@newsletter", { text });
        } else {
            return m.reply("Provide a media file or text to send.");
        }

        await m.reply("Message successfully sent to channel.");
    } catch (err) {
        console.error(err);
        await m.reply("Failed to send message to channel.");
    } finally {
        await global.loading(m, conn, true);
    }
};

handler.help = ["upch"];
handler.tags = ["owner"];
handler.command = /^(ch|upch)$/i;
handler.owner = true;

export default handler;
