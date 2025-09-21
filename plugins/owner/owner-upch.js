import fs from "fs/promises";
import path from "path";

let handler = async (m, { conn, text }) => {
    try {
        let q = m.quoted ? m.quoted : m;
        let mime = q.mimetype || "";
        let messageOptions = {};
        if (/image|video|audio/.test(mime)) {
            m.reply("🍱 *Sedang memproses media...*");
            let media = await q.download();
            let tempDir = path.resolve("./tmp");
            await fs.mkdir(tempDir, { recursive: true });
            let filePath = path.join(tempDir, `${Date.now()}`);
            await fs.writeFile(filePath, media);
            if (/image/.test(mime)) messageOptions.image = await fs.readFile(filePath);
            else if (/video/.test(mime)) messageOptions.video = await fs.readFile(filePath);
            else if (/audio/.test(mime)) {
                messageOptions.audio = await fs.readFile(filePath);
                messageOptions.ptt = true;
                messageOptions.mimetype = "audio/mpeg";
            }
            if (text) messageOptions.caption = text;
            await conn.sendMessage("120363417411850319@newsletter", messageOptions);
            await fs.unlink(filePath);
        } else if (text) {
            await conn.sendMessage("120363417411850319@newsletter", { text });
        } else {
            return m.reply("🍙 *Harap reply gambar, video, audio, atau ketik teks!*");
        }
        m.reply("🍤 *Pesan berhasil dikirim ke channel!*");
    } catch (e) {
        console.error(e);
        m.reply("🍢 *Terjadi kesalahan saat mengirim pesan ke channel!*");
    }
};

handler.help = ["upch"];
handler.tags = ["owner"];
handler.command = /^(ch|upch)$/i;
handler.owner = true;

export default handler;
