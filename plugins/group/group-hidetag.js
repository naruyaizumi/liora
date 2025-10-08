import fs from "fs/promises";
import path from "path";

let handler = async (m, { conn, text, participants }) => {
    const q = m.quoted || m;
    const mime = (q.msg || q).mimetype || "";
    const users = participants.map((p) => p.id);
    let message = text || q.text || "";
    const mentions = [];

    if (message) {
        for (const p of participants) {
            const id = p.id.split("@")[0];
            const lid = p.lid ? p.lid.split("@")[0] : null;
            if (message.includes("@" + id) || (lid && message.includes("@" + lid))) {
                mentions.push(p.id);
                message = message.replace("@" + lid, "@" + id).replace("@" + id, "@" + id);
            }
        }
    }

    const finalMentions = [...new Set([...users, ...mentions])];
    const options = { mentions: finalMentions, quoted: m };

    if (mime) {
        if (!/^(image|video|audio)\//.test(mime))
            return m.reply(`Unsupported file type. Only image, video, or audio allowed.`);

        const ext = mime.split("/")[1];
        const filePath = path.join("./tmp", `${Date.now()}.${ext}`);
        const media = await q.download();

        await fs.mkdir(path.dirname(filePath), { recursive: true });
        await fs.writeFile(filePath, media);

        const sendFile = async (type) => {
            await conn.sendFile(m.chat, filePath, `file.${ext}`, message, m, type === "audio", {
                ...options,
                mimetype: mime,
            });
            await fs.unlink(filePath).catch(() => {});
        };

        if (/image/.test(mime)) return sendFile("image");
        if (/video/.test(mime)) return sendFile("video");
        if (/audio/.test(mime)) return sendFile("audio");
    } else if (message) {
        await conn.sendMessage(m.chat, { text: message, ...options });
    } else {
        return m.reply(`Send a message, caption, or media to use hidetag.`);
    }
};

handler.help = ["hidetag"];
handler.tags = ["group"];
handler.command = /^(hidetag|ht|h)$/i;
handler.group = true;
handler.admin = true;

export default handler;
