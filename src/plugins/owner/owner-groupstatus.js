/**
 * @file Group status message command handler
 * @module plugins/owner/groupstatus
 * @license Apache-2.0
 * @author Naruya Izumi
 */

/**
 * Sends a group status update message (similar to WhatsApp group announcements)
 * @async
 * @function handler
 * @param {Object} m - Message object
 * @param {Object} sock - Connection object
 * @param {string} usedPrefix - Command prefix used
 * @param {string} command - Command name
 * @returns {Promise<void>}
 *
 * @description
 * This command allows bot owners to send group status updates that appear
 * as group announcements. Supports text, images, videos, and audio.
 *
 * @features
 * - Supports text, image, video, and audio status updates
 * - Can reply to media or provide text directly
 * - Uses WhatsApp's group status message protocol via contextInfo
 */

let handler = async (m, { sock, usedPrefix, command }) => {
    const q = m.quoted ?? m;
    const type = q.mtype || "";
    const mime = (q.msg || q).mimetype || "";

    const txt = m.text || "";
    let cap = txt.trim();
    const ptr = new RegExp(`^[.\\/#!]?${command}\\s*`, "i");
    cap = cap.replace(ptr, "").trim();

    try {
        if (!type && !cap) {
            return m.reply(
                `Reply media or text\nEx: ${usedPrefix + command} Hello or ${usedPrefix + command} reply`
            );
        }

        await global.loading(m, sock);

        let content = {};
        const ctx = { isGroupStatus: true };

        if (type === "imageMessage" || /image/.test(mime)) {
            const buf = await q.download();
            if (!buf) throw new Error("Download failed");
            content = { 
                image: buf, 
                caption: cap || "",
                contextInfo: ctx
            };
        } else if (type === "videoMessage" || /video/.test(mime)) {
            const buf = await q.download();
            if (!buf) throw new Error("Download failed");
            content = { 
                video: buf, 
                caption: cap || "",
                contextInfo: ctx
            };
        } else if (type === "audioMessage" || type === "ptt" || /audio/.test(mime)) {
            const buf = await q.download();
            if (!buf) throw new Error("Download failed");
            content = { 
                audio: buf, 
                mimetype: "audio/mp4",
                contextInfo: ctx
            };
        } else if (cap) {
            content = { 
                text: cap,
                contextInfo: ctx
            };
        } else {
            throw new Error("Reply media or text");
        }

        await sock.sendMessage(m.chat, content);

    } catch (e) {
        m.reply(`Error: ${e.message}`);
    } finally {
        await global.loading(m, sock, true);
    }
};

/**
 * Command metadata for help system
 * @property {Array<string>} help - Help text
 * @property {Array<string>} tags - Command categories
 * @property {RegExp} command - Command pattern matching
 * @property {boolean} owner - Owner-only command flag
 * @property {boolean} group - Group-only command flag
 */
handler.help = ["groupstatus"];
handler.tags = ["owner"];
handler.command = /^(statusgc|swgc)$/i;
handler.owner = true;
handler.group = true;

export default handler;