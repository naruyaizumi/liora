let handler = async (m, { conn, text, participants }) => {
    const q = m.quoted || m;
    const mime = (q.msg || q).mimetype || "";
    const users = participants.map((p) => p.id);
    const message = text || q.text || "";

    if (!message && !mime) return m.reply("Send a message or reply to media to use hidetag.");

    const options = { mentions: users, quoted: m };

    if (mime && /^(image|video|audio)\//.test(mime)) {
        const media = await q.download();
        if (!media) return m.reply("Failed to download media.");

        if (/image/.test(mime))
            return conn.sendMessage(m.chat, { image: media, caption: message, ...options });
        if (/video/.test(mime))
            return conn.sendMessage(m.chat, { video: media, caption: message, ...options });
        if (/audio/.test(mime))
            return conn.sendMessage(m.chat, { audio: media, mimetype: mime, ...options });
    }

    return conn.sendMessage(m.chat, { text: message, ...options });
};

handler.help = ["hidetag"];
handler.tags = ["group"];
handler.command = /^(hidetag|ht|h)$/i;
handler.group = true;
handler.admin = true;

export default handler;
