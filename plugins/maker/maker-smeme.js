import { uploader3 } from "../../lib/uploader.js";
import { sticker, fetch } from "liora-lib";

let handler = async (m, { conn, args, usedPrefix, command }) => {
    await global.loading(m, conn);
    try {
        if (!args[0])
            return m.reply(
                `Enter top and bottom text for meme (use | separator).\n› Example: ${usedPrefix + command} Top|Bottom`
            );

        const q = m.quoted ? m.quoted : m;
        const mime = (q.msg || q).mimetype || "";
        if (!mime || !/image\/(jpeg|png)/.test(mime))
            return m.reply("Reply to a JPG or PNG image to make a meme sticker.");

        const media = await q.download();
        const up = await uploader3(media).catch(() => null);
        if (!up) return m.reply("Failed to upload image to server. Try again later.");

        const [top, bottom] = args.join(" ").split("|");
        const apiUrl = `https://api.memegen.link/images/custom/${encodeURIComponent(
            top || "_"
        )}/${encodeURIComponent(bottom || "_")}.png?background=${encodeURIComponent(up)}`;

        const buffer = Buffer.from(await (await fetch(apiUrl)).arrayBuffer());
        const stickerImage = await sticker(buffer, {
            packName: global.config.stickpack || "",
            authorName: global.config.stickauth || "",
        });

        await conn.sendFile(m.chat, stickerImage, "meme.webp", "", m, false, {
            asSticker: true,
        });
    } catch (e) {
        console.error(e);
        m.reply("Error: " + e.message);
    } finally {
        await global.loading(m, conn, true);
    }
};

handler.help = ["smeme"];
handler.tags = ["maker"];
handler.command = /^(smeme)$/i;

export default handler;
