let handler = async (m, { conn, usedPrefix, command }) => {
    const quoted = m.quoted ? m.quoted : m;
    const mime = (quoted.msg || quoted).mimetype || "";

    const textToParse = m.text || "";
    const caption = textToParse
        .replace(new RegExp(`^[.!#/](${command})\\s*`, "i"), "")
        .trim();

    const jid = m.chat;

    try {
        if (!mime && !caption) {
            return m.reply(`Reply to media or provide text.\nExamples: ${ usedPrefix + command} Hello everyone! or ${ usedPrefix + command} reply to image/video/audio`
            );
        }

        await global.loading(m, conn);

        let payload = {};

        if (/image/.test(mime)) {
            const buffer = await quoted.download();
            if (!buffer) return m.reply('Failed to download image.');
            
            payload = {
                image: buffer,
                caption: caption || ''
            };
        } else if (/video/.test(mime)) {
            const buffer = await quoted.download();
            if (!buffer) return m.reply('Failed to download video.');
            
            payload = {
                video: buffer,
                caption: caption || ''
            };
        } else if (/audio/.test(mime)) {
            const buffer = await quoted.download();
            if (!buffer) return m.reply('Failed to download audio.');
            
            payload = {
                audio: buffer,
                mimetype: "audio/mp4"
            };
        } else if (caption) {
            payload = {
                text: caption
            };
        } else {
            return m.reply(
                `Reply to media or provide text.\nExamples: ${ usedPrefix + command} Hello everyone! or ${ usedPrefix + command} reply to image/video/audio`
            );
        }

        await conn.sendGroupStatus(jid, payload);
        
        m.reply('Group status sent successfully.');
    } catch (e) {
        conn.logger?.error(e);
        m.reply(`Error: ${e.message}`);
    } finally {
        await global.loading?.(m, conn, true);
    }
};

handler.help = ["groupstatus"];
handler.tags = ["owner"];
handler.command = /^(statusgc|swgc)$/i;
handler.owner = true;
handler.group = true;

export default handler;