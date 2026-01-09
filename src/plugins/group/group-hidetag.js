let handler = async (m, { text, participants, conn }) => {
    const q = m.quoted || m;
    const mime = (q.msg || q).mimetype || "";
    const txt = text || q.text || "";
    const jids = participants.map((p) => p.id);
    let msg = txt;

    const mentions = jids.filter((jid) => {
        const un = jid.split("@")[0];
        return txt.includes("@" + un);
    });

    const opt = {
        quoted: m,
        mentions: mentions.length ? mentions : jids,
    };

    if (mime) {
        const media = await q.download();
        const content = {};

        if (/image/.test(mime)) content.image = media;
        else if (/video/.test(mime)) content.video = media;
        else if (/audio/.test(mime)) {
            content.audio = media;
            content.ptt = true;
        } else if (/document/.test(mime)) {
            content.document = media;
            content.mimetype = mime;
            content.fileName = "file";
        } else return m.reply("Invalid media");

        if (msg) content.caption = msg;
        await conn.sendMessage(m.chat, content, opt);
    } else if (msg) {
        await conn.sendMessage(m.chat, { text: msg, mentions: opt.mentions }, opt);
    } else {
        m.reply("Send media/text or reply to a message");
    }
};

handler.help = ["hidetag"];
handler.tags = ["group"];
handler.command = /^(hidetag|ht|h)$/i;
handler.group = true;
handler.admin = true;

export default handler;
