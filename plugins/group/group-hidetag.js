import fs from "fs";
import path from "path";

let handler = async (m, { conn, text, participants }) => {
    let q = m.quoted || m;
    let mime = (q.msg || q).mimetype || "";
    let users = participants.map((p) => p.id);
    let teks = text || q.text || "";
    let mappedMentions = [];
    let finalText = teks;
    if (teks) {
        for (let p of participants) {
            if (p.lid && teks.includes("@" + p.lid.split("@")[0])) {
                mappedMentions.push(p.id);
                finalText = finalText.replace("@" + p.lid.split("@")[0], "@" + p.id.split("@")[0]);
            }
            if (p.id && teks.includes("@" + p.id.split("@")[0])) {
                mappedMentions.push(p.id);
            }
        }
    }
    let finalMentions = [...new Set([...users, ...mappedMentions])];
    let sendOpt = { mentions: finalMentions, quoted: m };
    if (mime) {
        let ext = mime.split("/")[1];
        let filePath = path.join("./tmp", `${Date.now()}.${ext}`);
        let media = await q.download();
        fs.writeFileSync(filePath, media);
        if (/image/.test(mime)) {
            await conn.sendFile(m.chat, filePath, `file.${ext}`, finalText, m, false, sendOpt);
        } else if (/video/.test(mime)) {
            await conn.sendFile(m.chat, filePath, `file.${ext}`, finalText, m, false, sendOpt);
        } else if (/audio/.test(mime)) {
            await conn.sendFile(m.chat, filePath, `file.${ext}`, "", m, true, {
                ...sendOpt,
                mimetype: "audio/mpeg",
            });
        } else if (/document/.test(mime)) {
            await conn.sendFile(m.chat, filePath, `file.${ext}`, finalText, m, false, {
                ...sendOpt,
                mimetype: mime,
            });
        }
        fs.unlinkSync(filePath);
    } else if (finalText) {
        await conn.sendMessage(m.chat, { text: finalText, mentions: finalMentions }, { quoted: m });
    } else {
        m.reply("⚠️ *Kirim media atau teks, atau balas pesan.*");
    }
};

handler.help = ["hidetag"];
handler.tags = ["group"];
handler.command = /^(hidetag|ht|h)$/i;
handler.group = true;
handler.admin = true;

export default handler;
