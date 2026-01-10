/**
 * @file Threads (Meta) downloader command handler
 * @module plugins/downloader/threads
 * @license Apache-2.0
 * @author Naruya Izumi
 */

/**
 * Downloads content from Threads (Meta) posts
 * @async
 * @function handler
 * @param {Object} m - Message object
 * @param {Object} conn - Connection object
 * @param {Array} args - Command arguments
 * @param {string} usedPrefix - Command prefix used
 * @param {string} command - Command name
 * @returns {Promise<void>}
 *
 * @description
 * Downloads media from Threads posts including videos and images.
 * Supports single images, multiple images, and videos.
 *
 * @features
 * - Downloads Threads videos and images
 * - Supports image carousels (multiple images)
 * - Preserves captions when available
 * - Shows loading indicators during processing
 */

import { threads } from "#api/threads.js";

let handler = async (m, { conn, args, usedPrefix, command }) => {
    const url = args[0];
    if (!url) {
        return m.reply(
            `Need Threads URL\nEx: ${usedPrefix + command} https://threads.net/xxx`
            );
    }
    
    await global.loading(m, conn);
    
    try {
        const { success, caption, images, videos, error } =
        await threads(url);
        if (!success) throw new Error(error);
        
        if (videos.length > 0) {
            const v = videos[videos.length - 1];
            await conn.sendMessage(m.chat, { video: { url: v },
                    caption }, { quoted: m });
        } else if (images.length > 0) {
            if (images.length === 1) {
                await conn.sendMessage(
                    m.chat, { image: { url: images[0] },
                        caption }, { quoted: m }
                );
            } else {
                const album = {
                    album: images.map((img, i) => ({
                        image: { url: img },
                        caption: `${i + 1}/${images.length}`,
                    }))
                };
                await conn.client(m.chat, album, { quoted: m });
            }
        } else {
            throw new Error("No media found");
        }
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
 */
handler.help = ["threads"];
handler.tags = ["downloader"];
handler.command = /^(threads)$/i;

export default handler;