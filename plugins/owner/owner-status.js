import fs from "fs/promises";

let handler = async (m, { conn, text }) => {
    try {
        const q = m.quoted ? m.quoted : m;
        const mime = (q.msg || q).mimetype || "";
        const content = {};

        const groups = Object.keys(conn.chats)
            .filter((jid) => jid.endsWith("@g.us"))
            .slice(0, 5);

        if (!groups.length) return m.reply("No active group found where the bot is a member.");

        if (mime) {
            const media = await q.download();
            if (!media) return m.reply("Failed to download media.");

            if (/image/.test(mime)) {
                content.image = media;
                if (text) content.caption = text;
            } else if (/video/.test(mime)) {
                content.video = media;
                if (text) content.caption = text;
            } else if (/audio/.test(mime)) {
                content.audio = media;
                content.mimetype = "audio/mpeg";
                content.ptt = true;
            } else return m.reply("Unsupported media type.");
        } else {
            if (!text) return m.reply("Message text required.");
            content.text = text;
        }

        await global.loading(m, conn);
        await conn.sendStatusMentions(content, groups);
        await global.loading(m, conn, true);

        m.reply(`Status mention sent to ${groups.length} group(s).`);
    } catch (e) {
        console.error(e);
        m.reply("Error: Failed to send status mentions.\n" + e.message);
    }
};

handler.help = ["tagsw"];
handler.tags = ["owner"];
handler.command = /^(tagsw)$/i;
handler.owner = true;

export default handler;
