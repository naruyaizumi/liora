import sharp from "sharp";

let handler = async (m, { conn, usedPrefix, command, args }) => {
    const levelArg = parseInt(args[0], 10);
    const level = Number.isInteger(levelArg) && levelArg >= 1 && levelArg <= 5 ? levelArg : null;

    const q = m.quoted ? m.quoted : m;
    const mime = (q.msg || q).mimetype || q.mediaType || "";
    if (!/^image\/(jpe?g|png|webp)$/i.test(mime))
        return m.reply(
            `Send or reply to an image (jpg/png/webp) with: ${usedPrefix + command} [1-5]`
        );

    await global.loading(m, conn);
    try {
        const input = await q.download();
        if (!input?.length) return m.reply("Failed to download the image.");

        const img = sharp(input, { failOn: "none" });
        const meta = await img.metadata().catch(() => ({}));
        const format = (meta.format || "").toLowerCase();
        const hasAlpha = !!meta.hasAlpha;
        const beforeBytes = input.length;
        const sizeKB = Math.ceil(beforeBytes / 1024);

        const autoLevel = (() => {
            if (level) return level;
            if (sizeKB <= 300) return 1;
            if (sizeKB <= 1000) return 2;
            if (sizeKB <= 3000) return 3;
            if (sizeKB <= 8000) return 4;
            return 5;
        })();

        const baseQ = { 1: 90, 2: 75, 3: 60, 4: 45, 5: 30 }[autoLevel];
        let quality = baseQ;
        if (sizeKB > 3000) quality -= 10;
        if (sizeKB > 6000) quality -= 10;
        if (sizeKB > 10000) quality -= 10;
        if (sizeKB < 200) quality += 5;
        quality = Math.max(20, Math.min(95, quality));

        let outFormat;
        const pipe = sharp(input, { failOn: "none" });

        if (format === "jpeg" || format === "jpg") {
            pipe.jpeg({ quality, mozjpeg: true, chromaSubsampling: "4:2:0" });
            outFormat = "jpeg";
        } else if (format === "webp") {
            pipe.webp({ quality, effort: 4, nearLossless: false });
            outFormat = "webp";
        } else if (format === "png") {
            if (autoLevel >= 3) {
                pipe.webp({ quality, effort: 4, nearLossless: false });
                outFormat = "webp";
            } else {
                pipe.png({ compressionLevel: 9, palette: true, quality: 100 });
                outFormat = "png";
            }
        } else return m.reply("Unsupported image format.");

        const output = await pipe.toBuffer();
        if (!output?.length) return m.reply("Compression failed.");

        const afterBytes = output.length;
        const saved = Math.max(0, beforeBytes - afterBytes);
        const ratio = beforeBytes ? ((saved / beforeBytes) * 100).toFixed(1) : "0.0";

        const result = [
            `Image Compression`,
            `Level   : ${autoLevel} (Q≈${quality})`,
            `Format  : ${format} → ${outFormat}`,
            `Before  : ${formatBytes(beforeBytes)}`,
            `After   : ${formatBytes(afterBytes)}`,
            `Saved   : ${formatBytes(saved)} (${ratio}%)`,
            `Compression completed successfully.`,
        ].join("\n");

        await conn.sendMessage(
            m.chat,
            { image: output, mimetype: outMime(outFormat, hasAlpha), caption: result },
            { quoted: m }
        );
    } catch (e) {
        conn.logger.error(e);
        m.reply(`Error: ${e.message}`);
    } finally {
        await global.loading(m, conn, true);
    }
};

handler.help = ["compress"];
handler.tags = ["tools"];
handler.command = /^(compress|kompres)$/i;

export default handler;

function outMime(fmt, hasAlpha) {
    if (fmt === "jpeg") return "image/jpeg";
    if (fmt === "webp") return "image/webp";
    if (fmt === "png") return "image/png";
    return hasAlpha ? "image/png" : "image/jpeg";
}

function formatBytes(b) {
    if (!b && b !== 0) return "-";
    const u = ["B", "KB", "MB", "GB"];
    let i = 0;
    let n = b;
    while (n >= 1024 && i < u.length - 1) {
        n /= 1024;
        i++;
    }
    return `${n.toFixed(n >= 100 ? 0 : n >= 10 ? 1 : 2)} ${u[i]}`;
}
