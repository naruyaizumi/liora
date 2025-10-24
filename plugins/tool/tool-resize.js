import sharp from "sharp";

let handler = async (m, { conn, args, usedPrefix, command }) => {
    try {
        const towidth = parseInt(args[0]);
        const toheight = parseInt(args[1]);
        if (!towidth || !toheight)
            return m.reply(`Enter target size.\n› Example: ${usedPrefix + command} 1000 500`);

        const q = m.quoted ? m.quoted : m;
        const mime = (q.msg || q).mimetype || q.mediaType || "";
        if (!mime) return m.reply("No media detected. Reply or send an image.");
        if (!/image\/(jpe?g|png|webp)/i.test(mime)) return m.reply(`Unsupported format: ${mime}`);

        await global.loading(m, conn);

        const media = await q.download();
        if (!media?.length) return m.reply("Failed to download media.");

        const before = await sharp(media).metadata();
        const beforeRatio = before.width / before.height;
        const targetRatio = towidth / toheight;
        const fitMode = Math.abs(beforeRatio - targetRatio) < 0.05 ? "inside" : "cover";

        const resized = await sharp(media)
            .resize(towidth, toheight, { fit: fitMode, position: "centre" })
            .toBuffer();

        const after = await sharp(resized).metadata();

        const caption = [
            "Image Resize",
            `Original : ${before.width}×${before.height}px`,
            `Resized : ${after.width}×${after.height}px`,
            `Mode : ${fitMode.toUpperCase()}`,
            "Resize completed successfully.",
        ].join("\n");

        await conn.sendMessage(m.chat, { image: resized, caption }, { quoted: m });
    } catch (e) {
        conn.logger.error(e);
        m.reply(`Error: ${e.message}`);
    } finally {
        await global.loading(m, conn, true);
    }
};

handler.help = ["resize"];
handler.tags = ["tools"];
handler.command = /^(resize|crop)$/i;

export default handler;
