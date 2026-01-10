/**
 * @file Twitter/X downloader command handler
 * @module plugins/downloader/twitter
 * @license Apache-2.0
 * @author Naruya Izumi
 */

/**
 * Downloads content from Twitter/X posts
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
 * Downloads media from Twitter/X posts including videos and images.
 * Supports single images, image galleries, and video tweets.
 *
 * @features
 * - Downloads Twitter/X videos and images
 * - Supports image galleries (multiple images)
 * - Preserves original filenames for videos
 * - Shows loading indicators during processing
 */

import { twitter } from "#api/twitter.js";

let handler = async (m, { conn, args, usedPrefix, command }) => {
    if (!args[0]) {
        return m.reply(`Need Twitter URL\nEx: ${usedPrefix + command} https://x.com/xxx`);
    }

    await global.loading(m, conn);

    try {
        const { success, photos, video, error } = await twitter(args[0]);
        if (!success) throw new Error(error);

        if (photos?.length === 1) {
            await conn.sendMessage(m.chat, { image: { url: photos[0] } }, { quoted: m });
        } else if (photos?.length > 1) {
            const album = photos.map((img, i) => ({
                image: { url: img },
                caption: `${i + 1}/${photos.length}`,
            }));
            await conn.client(m.chat, album, { quoted: m });
        } else if (video) {
            await conn.sendMessage(
                m.chat,
                {
                    video: { url: video },
                    fileName: `twitter.mp4`,
                },
                { quoted: m }
            );
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
handler.help = ["twitter"];
handler.tags = ["downloader"];
handler.command = /^(twitter)$/i;

export default handler;
