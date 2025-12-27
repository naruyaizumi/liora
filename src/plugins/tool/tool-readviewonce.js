let handler = async (m, { conn }) => {
    const q = m.quoted;
    try {
        const media = q?.mediaMessage;
        
        if (!media) {
            return m.reply("No media found in quoted message.");
        }

        const vid = media.videoMessage;
        const img = media.imageMessage;
        const aud = media.audioMessage;

        const msg = vid || img || aud;

        if (!msg) {
            return m.reply("Unsupported media type.");
        }

        if (!msg.viewOnce) {
            return m.reply("This is not a view-once message.");
        }

        const buffer = await q.download?.();
        if (!buffer) {
            return m.reply("Failed to retrieve media.");
        }

        const mime = msg.mimetype || "";
        
        let type;
        if (mime.startsWith("image/") || img) {
            type = "image";
        } else if (mime.startsWith("video/") || vid) {
            type = "video";
        } else if (mime.startsWith("audio/") || aud) {
            type = "audio";
        } else {
            return m.reply("Unsupported media type.");
        }

        const caption = msg.caption || q.text || "";
        const ctx = {};
        
        if (msg.contextInfo?.mentionedJid?.length > 0) {
            ctx.mentionedJid = msg.contextInfo.mentionedJid;
        }

        await conn.sendMessage(
            m.chat,
            {
                [type]: buffer,
                mimetype: mime,
                caption,
                contextInfo: ctx,
            },
            { quoted: m }
        );

    } catch (e) {
        global.logger?.error(e);
        m.reply(`Error: ${e.message}`);
    }
};

handler.help = ["readviewonce"];
handler.tags = ["tools"];
handler.command = /^(read(view(once)?)?|rvo)$/i;

export default handler;