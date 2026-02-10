/**
 * @file Hidetag command handler
 * @module plugins/group/hidetag
 * @license Apache-2.0
 * @author Naruya Izumi
 */

let handler = async (m, { text, sock }) => {
    const q = m.quoted || m;
    const mime = (q.msg || q).mimetype || "";

    const msg = "@all" + (text ? " " + text : "");

    const opt = {
        quoted: m,
        contextInfo: { nonJidMentions: 1 }
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

        content.caption = msg;
        content.contextInfo = { nonJidMentions: 1 };

        await sock.sendMessage(m.chat, content, opt);
    } else {
        await sock.sendMessage(
            m.chat,
            { text: msg, contextInfo: { nonJidMentions: 1 } },
            opt
        );
    }
};

handler.help = ["hidetag"];
handler.tags = ["group"];
handler.command = /^(hidetag|ht|h)$/i;
handler.group = true;
handler.admin = true;

export default handler;