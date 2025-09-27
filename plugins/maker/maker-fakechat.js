import { uploader } from "../../lib/uploader.js";
import { sticker, fakechat } from "../../lib/sticker.js";

let handler = async (m, { conn, text, usedPrefix, command }) => {
    try {
        let q = m.quoted && !text ? m.quoted : m;
        let mime = (q.msg || q).mimetype || "";
        let txt = text ? text : q.text;
        if (!txt)
            return m.reply(
                `🍬 *Masukkan teks atau balas pesan teks yaa!*\n\n✨ *Contoh: ${usedPrefix + command} halo*`
            );
        await global.loading(m, conn);
        let avatar = await conn
            .profilePictureUrl(q.sender, "image")
            .catch((_) => "https://i.ibb.co.com/WY9SCc2/150fa8800b0a0d5633abc1d1c4db3d87.jpg"); // eslint-disable-line no-unused-vars
        if (!/image\/(jpe?g|png)|opus|webp/i.test(mime)) {
            let req = await fakechat(txt, q.name || m.pushName || "User", avatar, false, true);
            let stiker = await sticker(
                false,
                req,
                global.config.stickpack,
                global.config.stickauth
            );
            await conn.sendFile(m.chat, stiker, "sticker.webp", "", m);
        } else {
            let img = await q.download();
            let { files } = await uploader(img);
            let req = await fakechat(
                txt,
                q.name || m.pushName || "User",
                avatar,
                files[0].url,
                true
            );
            let stiker = await sticker(
                false,
                req,
                global.config.stickpack,
                global.config.stickauth
            );
            await conn.sendFile(m.chat, stiker, "sticker.webp", "", m);
        }
    } catch (e) {
        console.error(e);
        m.reply("❌ *Terjadi kesalahan saat membuat fakechat!* 🍡");
    } finally {
        await global.loading(m, conn, true);
    }
};

handler.help = ["fakechat"];
handler.tags = ["maker"];
handler.command = /^(fakechat|qc)$/i;

export default handler;
