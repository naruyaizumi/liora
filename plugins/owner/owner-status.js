import { uploader } from "../../lib/uploader.js";

let handler = async (m, { conn, text }) => {
    const quoted = m.quoted;
    if (!quoted) return m.reply("Reply to a media message to send status mentions.");
    
    let content = {};

    try {
        const groupData = await conn.groupFetchAllParticipating();
        const groupJids = Object.values(groupData)
            .map(g => g.id)
            .filter(id => id.endsWith("@g.us"))
            .slice(0, 5);

        if (!groupJids.length) {
            return m.reply("No active group found where the bot is a member.");
        }
        
        await global.loading(m, conn);
        const mime = (quoted.msg || quoted).mimetype || "";
        const mediaBuffer = await quoted.download();
        if (!mediaBuffer) return m.reply("Failed to download media.");

        const uploadedUrl = await uploader(mediaBuffer).catch(() => null);
        if (!uploadedUrl) return m.reply("Failed to upload media.");

        if (/image/.test(mime)) {
            content = { image: { url: uploadedUrl }, caption: text || "" };
        } else if (/video/.test(mime)) {
            content = { video: { url: uploadedUrl }, caption: text || "" };
        } else if (/audio/.test(mime)) {
            content = {
                audio: { url: uploadedUrl },
                mimetype: "audio/mpeg",
                ptt: true
            };
        } else {
            return m.reply("Unsupported media type.");
        }

        await conn.sendStatusMentions(content, groupJids);
        m.reply(`Status mention sent to ${groupJids.length} group(s).`);
    } catch (e) {
        conn.logger.error(e);
        m.reply(`Error: ${e.message}`);
    } finally {
        await global.loading(m, conn, true);
    }
};

handler.help = ["tagsw"];
handler.tags = ["owner"];
handler.command = /^(tagsw)$/i;
handler.owner = true;

export default handler;