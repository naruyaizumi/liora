let handler = async (m, { text, usedPrefix, command, sock }) => {
    const q = m.quoted || m;
    const mime = (q.msg || q).mimetype || "";
    
    let cleanText = text || "";
    if (usedPrefix && command && cleanText) {
        const regex = new RegExp(
            `^\\${usedPrefix}${command}\\s*`,
            "i"
        );
        cleanText = cleanText.replace(regex, "");
    }
    
    const txt = cleanText || q.text || "";
    
    let msg = "@all" + (txt || "");
    
    const opt = {
        quoted: m,
        contextInfo: {
            nonJidMentions: 1
        }
    };
    
    if (mime) {
        const media = await q.download();
        const content = {};
        
        if (/image/.test(mime)) {
            content.image = media;
        } else if (/video/.test(mime)) {
            content.video = media;
        } else if (/audio/.test(mime)) {
            content.audio = media;
            content.ptt = true;
        } else if (/document/.test(mime)) {
            content.document = media;
            content.mimetype = mime;
            content.fileName = "file";
        } else {
            return m.reply("Invalid media");
        }
        
        content.caption = msg;
        content.contextInfo = {
            nonJidMentions: 1
        };
        
        await sock.sendMessage(m.chat, content, opt);
    } else if (msg) {
        await sock.sendMessage(
            m.chat,
            {
                text: msg,
                contextInfo: {
                    nonJidMentions: 1
                }
            },
            opt
        );
    } else {
        m.reply("Send media/text or reply to a message");
    }
};

handler.help = ["hidetag"];
handler.tags = ["group"];
handler.command = /^(hidetag|ht|h)$/i;
handler.group = true;
//handler.admin = true;

export default handler;