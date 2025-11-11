import { uploader } from "../../lib/uploader.js";

let handler = async (m, { conn, args, command, usedPrefix }) => {
    try {
        const q = m.quoted ?? m;
        const mime = (q.msg || q).mimetype || "";
        if (!mime || !/image\/(jpeg|png)/.test(mime))
            return m.reply("Only JPEG or PNG images are supported for Ghibli transformation.");

        if (!args[0] || !["1", "2"].includes(args[0])) {
            return m.reply(
                `Please specify a version.\nUsage: ${usedPrefix + command} 1 or ${usedPrefix + command} 2`
            );
        }

        await global.loading(m, conn);
        const media = await q.download();
        const uploaded = await uploader(media);
        if (!uploaded) throw new Error("Failed to upload image. Please try again later.");

        const version = args[0];
        const api = `https://api.nekolabs.web.id/tools/convert/toghibli/v${version}?imageUrl=${encodeURIComponent(uploaded)}`;
        const res = await fetch(api);
        if (!res.ok) throw new Error("Failed to contact API.");

        const json = await res.json();
        const img1Url = json.result;

        if (!img1Url) throw new Error("Failed to process image to Ghibli style.");

        await conn.sendMessage(
            m.chat,
            {
                image: { url: img1Url },
                caption: `Ghibli-style transformation result (v${version}).`,
            },
            { quoted: m }
        );
    } catch (e) {
        conn.logger.error(e);
        m.reply(`Error: ${e.message}`);
    } finally {
        await global.loading(m, conn, true);
    }
};

handler.help = ["toghibli"];
handler.tags = ["maker"];
handler.command = /^(toghibli)$/i;

export default handler;
