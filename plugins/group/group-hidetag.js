let handler = async (m, { text, participants, conn }) => {
    try {
        const q = m.quoted || m;
        const mime = (q.msg || q).mimetype || "";
        const teks = text || q.text || "";
        const allJids = participants.map((p) => p.id);
        let finalText = teks;
        const mentions = allJids.filter((jid) => {
            const username = jid.split("@")[0];
            if (teks.includes("@" + username)) {
                return true;
            }
            return false;
        });

        const sendOpts = { quoted: m, mentions: mentions.length ? mentions : allJids };

        if (mime) {
            const media = await q.download();
            const messageContent = {};

            if (/image/.test(mime)) messageContent.image = media;
            else if (/video/.test(mime)) messageContent.video = media;
            else if (/audio/.test(mime)) {
                messageContent.audio = media;
                messageContent.ptt = true;
            } else if (/document/.test(mime)) {
                messageContent.document = media;
                messageContent.mimetype = mime;
                messageContent.fileName = "file";
            } else return m.reply("Unsupported media type.");

            if (finalText) messageContent.caption = finalText;
            await conn.sendMessage(m.chat, messageContent, sendOpts);
        } else if (finalText) {
            await conn.sendMessage(
                m.chat,
                { text: finalText, mentions: sendOpts.mentions },
                sendOpts
            );
        } else {
            m.reply("Please provide media or text, or reply to a message.");
        }
    } catch (e) {
        conn.logger.error(e);
        m.reply(`Error: ${e.message}`);
    }
};

handler.help = ["hidetag"];
handler.tags = ["group"];
handler.command = /^(hidetag|ht|h)$/i;
handler.group = true;
handler.admin = true;

export default handler;
