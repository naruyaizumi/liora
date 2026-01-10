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
 * @param {Object} conn - Connection object
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
 * - Uses WhatsApp's group status message protocol
 * - Includes encryption for message security
 *
 * @supportedMedia
 * - Images (JPEG, PNG, WebP)
 * - Videos (MP4, MOV, etc.)
 * - Audio (MP3, MP4 audio, voice notes)
 * - Plain text messages
 */

let handler = async (m, { conn, usedPrefix, command }) => {
    const q = m.quoted ? m.quoted : m;
    const type = q.mtype || "";
    const mime = (q.msg || q).mimetype || "";
    
    const txt = m.text || "";
    let cap = txt.trim();
    const ptr = new RegExp(`^[.\\/#!]?${command}\\s*`, "i");
    cap = cap.replace(ptr, "").trim();
    
    try {
        if (!type && !cap) {
            return m.reply(
                `Reply to media or provide text\nEx: ${usedPrefix + command} Hello or ${usedPrefix + command} reply`
            );
        }
        
        await global.loading(m, conn);
        
        let c = {};
        
        if (type === "imageMessage" || /image/.test(mime)) {
            const d = await q.download();
            if (!d) throw new Error("Failed to download image");
            
            const buf = Buffer.from(d.buffer, d.byteOffset, d
                .byteLength);
            
            c = {
                image: buf,
                caption: cap || "",
            };
        } else if (type === "videoMessage" || /video/.test(mime)) {
            const d = await q.download();
            if (!d) throw new Error("Failed to download video");
            
            const buf = Buffer.from(d.buffer, d.byteOffset, d
                .byteLength);
            
            c = {
                video: buf,
                caption: cap || "",
            };
        } else if (type === "audioMessage" || type === "ptt" || /audio/
            .test(mime)) {
            const d = await q.download();
            if (!d) throw new Error("Failed to download audio");
            
            const buf = Buffer.from(d.buffer, d.byteOffset, d
                .byteLength);
            
            c = {
                audio: buf,
                mimetype: "audio/mp4",
            };
        } else if (cap) {
            c = {
                text: cap,
            };
        } else {
            throw new Error("Reply to media or provide text");
        }
        
        const { generateWAMessageContent,
            generateWAMessageFromContent } = await import("baileys");
        
        const { backgroundColor, ...cNoBg } = c;
        
        const inside = await generateWAMessageContent(cNoBg, {
            upload: conn.waUploadToServer,
            backgroundColor: backgroundColor || undefined,
        });
        
        const secret = new Uint8Array(32);
        crypto.getRandomValues(secret);
        
        const msg = generateWAMessageFromContent(
            m.chat,
            {
                messageContextInfo: {
                    messageSecret: secret,
                },
                groupStatusMessageV2: {
                    message: {
                        ...inside,
                        messageContextInfo: {
                            messageSecret: secret,
                        },
                    },
                },
            },
            {
                userJid: conn.user.id,
                quoted: m,
            }
        );
        
        await conn.relayMessage(m.chat, msg
        .message, {
            messageId: msg.key.id,
        });
        
        m.reply("Group status sent");
    } catch (e) {
        m.reply(`Error: ${e.message}`);
    } finally {
        await global.loading(m, conn, true);
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
handler.help = ["groupstatus <text/media>"];
handler.tags = ["owner"];
handler.command = /^(statusgc|swgc)$/i;
handler.owner = true;
handler.group = true;

export default handler;