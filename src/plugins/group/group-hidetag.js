/**
 * @file Hidetag command handler
 * @module plugins/group/hidetag
 * @license Apache-2.0
 * @author Naruya Izumi
 */

/**
 * Sends a message to all group members without notifying them
 * @async
 * @function handler
 * @param {Object} m - Message object
 * @param {Object} param1 - Destructured parameters
 * @param {string} param1.text - Text argument
 * @param {Array} param1.participants - Group participants list
 * @param {Object} param1.sock - Connection object
 * @returns {Promise<void>}
 *
 * @description
 * Command to send messages or media to all group members without triggering notifications.
 * Can send text messages, images, videos, audio, or documents.
 *
 * @features
 * - Send text messages without notifications
 * - Send media files without notifications
 * - Support for images, videos, audio, documents
 * - Automatically detects and mentions all group members
 * - Can reply to existing messages
 */

let handler = async (m, { text, sock }) => {
    const q = m.quoted || m;
    const mime = (q.msg || q).mimetype || "";
    const txt = text || q.text || "";
    
    let msg = '@all';
    if (txt.trim()) {
        msg += ' ' + txt.trim();
    }

    const opt = {
        quoted: m,
        contextInfo: {
            nonJidMentions: 1
        }
    };

    if (mime) {
        const media = await q.download();
        const content = {};

        if (/image/.test(mime)) content.image = media;
        else if (/video/.test(mime)) content.video = media;
        else if (/audio/.test(mime)) {
            content.audio = media;
            content.ptt = true;
        } else if (/document/.test(mime)) {
            content.document = media;
            content.mimetype = mime;
            content.fileName = "file";
        } else return m.reply("Invalid media");

        content.caption = msg;
        content.contextInfo = {
            nonJidMentions: 1
        };
        
        await sock.sendMessage(m.chat, content, opt);
    } else if (msg) {
        const content = {
            text: msg,
            contextInfo: {
                nonJidMentions: 1
            }
        };
        await sock.sendMessage(m.chat, content, opt);
    } else {
        m.reply("Send media/text or reply to a message");
    }
};

/**
 * Command metadata for help system
 * @property {Array<string>} help - Help text
 * @property {Array<string>} tags - Command categories
 * @property {RegExp} command - Command pattern matching
 * @property {boolean} group - Whether command works only in groups
 * @property {boolean} admin - Whether user needs admin privileges
 */
handler.help = ["hidetag"];
handler.tags = ["group"];
handler.command = /^(hidetag|ht|h)$/i;
handler.group = true;
handler.admin = true;

export default handler;