import { uploader } from "../../lib/uploader.js";
import { fetch } from "liora-lib";

let handler = async (m, { conn, usedPrefix, command }) => {
    try {
        const q = m.quoted ? m.quoted : m;
        const mime = (q.msg || q).mimetype || "";

        if (!mime || !/image\/(jpeg|png|jpg)/.test(mime)) {
            return m.reply(
                `Reply or send an image with the command:\nExample: ${usedPrefix + command}`
            );
        }

        await global.loading(m, conn);

        const media = await q.download().catch(() => null);
        if (!media) return m.reply("Failed to download the image. Make sure the file is valid.");

        const uploaded = await uploader(media).catch(() => null);
        if (!uploaded) return m.reply("Image upload failed. Please try again later.");

        const apiUrl = global.API("btz", "/api/search/agedetect", { url: uploaded }, "apikey");
        const res = await fetch(apiUrl);
        if (!res.ok) return m.reply("Error while analyzing the image.");

        const json = await res.json();
        if (!json.result) return m.reply("No face detected or an error occurred.");

        const { score, age, gender, expression, faceShape } = json.result;

        const caption = `
Age & Gender Detection
────────────────────────────
Estimated Age: ${age}
Gender: ${gender}
Facial Expression: ${expression}
Face Shape: ${faceShape}
Confidence Score: ${score}%
────────────────────────────
Result generated from the image you sent.
`.trim();

        await conn.sendMessage(
            m.chat,
            {
                image: { url: uploaded },
                caption,
            },
            { quoted: q.id ? q : m }
        );
    } catch (e) {
        conn.logger.error(e);
        m.reply(`Error: ${e.message}`);
    } finally {
        await global.loading(m, conn, true);
    }
};

handler.help = ["agedetect"];
handler.tags = ["ai"];
handler.command = /^(agedetect)$/i;

export default handler;
