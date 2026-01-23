/**
 * @file Instagram downloader command handler
 * @module plugins/downloader/instagram
 * @license Apache-2.0
 * @author Naruya Izumi
 */

/**
 * Downloads Instagram posts, reels, and image carousels
 * @async
 * @function handler
 * @param {Object} m - Message object
 * @param {Object} sock - Connection object
 * @param {Array} args - Command arguments
 * @param {string} usedPrefix - Command prefix used
 * @param {string} command - Command name
 * @returns {Promise<void>}
 *
 * @description
 * Downloads Instagram content including videos, single images, and image carousels.
 * Uses multiple API endpoints for reliability and supports various post types.
 *
 * @features
 * - Supports videos, single images, and image carousels
 * - Uses multiple backup API endpoints
 * - Shows loading indicators during processing
 * - Handles errors with user-friendly messages
 */

import { instagram } from "#api/instagram.js";

let handler = async (m, { sock, args, usedPrefix, command }) => {
    const url = args[0];
    if (!url) {
        return m.reply(
            `Need Instagram URL\nEx: ${usedPrefix + command} https://instagram.com/p/xxx`
        );
    }

    if (!/^https?:\/\/(www\.)?instagram\.com\//i.test(url)) {
        return m.reply("Invalid Instagram URL");
    }

    if (/\/stories\//i.test(url)) {
        return m.reply("No stories support");
    }

    await global.loading(m, sock);

    try {
        const { success, type, urls, error } = await instagram(url);
        if (!success) throw new Error(error || "Failed");

        if (type === "video") {
            await sock.sendMessage(
                m.chat,
                { video: { url: urls[0] }, mimetype: "video/mp4" },
                { quoted: m }
            );
        } else if (type === "images") {
            if (urls.length === 1) {
                await sock.sendMessage(m.chat, { image: { url: urls[0] } }, { quoted: m });
            } else {
                const album = {
                    album: urls.map((img, i) => ({
                        image: { url: img },
                        caption: `${i + 1}/${urls.length}`,
                    })),
                };
                await sock.client(m.chat, album, { quoted: m });
            }
        }
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
 */
handler.help = ["instagram"];
handler.tags = ["downloader"];
handler.command = /^(instagram|ig)$/i;

export default handler;
