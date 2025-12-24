/* todo
let handler = async (m, { conn, text }) => {
    const quoted = m.quoted;
    if (!quoted) return m.reply("Reply to a media message to send status mentions.");

    let content = {};

    try {
        const groupData = await conn.groupFetchAllParticipating();
        const groupJids = Object.values(groupData)
            .map((g) => g.id)
            .filter((id) => id.endsWith("@g.us"))
            .slice(0, 5);

        if (!groupJids.length) return m.reply("No active group found.");

        await global.loading(m, conn);

        const mime = (quoted.msg || quoted).mimetype || "";
        const mediaBuffer = await quoted.download();
        if (!mediaBuffer) return m.reply("Failed to download media.");

        if (/image/.test(mime)) {
            content = { image: mediaBuffer, caption: text || "" };
        } else if (/video/.test(mime)) {
            content = { video: mediaBuffer, caption: text || "" };
        } else if (/audio/.test(mime)) {
            content = {
                audio: mediaBuffer,
                mimetype: "audio/mpeg",
                ptt: true,
            };
        } else {
            return m.reply("Unsupported media type.");
        }

        await conn.sendStatusMentions(content, groupJids);
        m.reply(`Status mention sent to ${groupJids.length} group(s).`);
    } catch (e) {
        global.logger.error(e);
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
*/
