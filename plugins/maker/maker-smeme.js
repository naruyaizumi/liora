import { sticker } from "#add-on";
import { uploader } from "../../lib/uploader.js";

let handler = async (m, { conn, args, usedPrefix, command }) => {
    try {
        const q = m.quoted ?? m;
        const mime = (q.msg || q).mimetype || "";
        if (!mime || !/image\/(jpeg|png|webp)/.test(mime))
            return m.reply("Only JPEG, PNG, or WEBP images are supported.");

        const [textT = "", textB = ""] = args.join(" ").split("|");
        if (!textT && !textB)
            return m.reply(
                `Please provide meme text.\n› Example: ${usedPrefix + command} top|bottom`
            );

        await global.loading(m, conn);
        const media = await q.download();
        const uploaded = await uploader(media);
        if (!uploaded) throw new Error("Failed to upload image.");

        const api = `https://api.nekolabs.web.id/canvas/meme?imageUrl=${encodeURIComponent(uploaded)}&textT=${encodeURIComponent(textT)}&textB=${encodeURIComponent(textB)}`;
        const res = await fetch(api);
        if (!res.ok) throw new Error("Failed to contact Meme API.");

        const buffer = Buffer.from(await res.arrayBuffer());

        const stickerImage = await sticker(buffer, {
            packName: global.config.stickpack || "",
            authorName: global.config.stickauth || "",
        });

        await conn.sendMessage(m.chat, { sticker: stickerImage }, { quoted: m });
    } catch (e) {
        conn.logger.error(e);
        m.reply(`Error: ${e.message}`);
    } finally {
        await global.loading(m, conn, true);
    }
};

handler.help = ["smeme"];
handler.tags = ["maker"];
handler.command = /^(smeme)$/i;

export default handler;
