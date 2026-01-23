/**
 * @file TikTok downloader command handler
 * @module plugins/downloader/tiktok
 * @license Apache-2.0
 * @author Naruya Izumi
 */

/**
 * Downloads content from TikTok posts
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
 * Downloads media from TikTok posts including videos and image slideshows.
 * Supports both video posts and multi-image slideshows.
 *
 * @features
 * - Downloads TikTok videos and image slideshows
 * - Validates TikTok URL formats (vm., vt., m., www.)
 * - Supports single and multiple image posts
 * - Shows loading indicators during processing
 */

import { tiktok } from "#api/tiktok.js";

let handler = async (m, { sock, args, usedPrefix, command }) => {
    const url = args[0];
    if (!url) {
        return m.reply(`Need TikTok URL\nEx: ${usedPrefix + command} https://vt.tiktok.com/xxx`);
    }

    if (!/^https?:\/\/(www\.)?(vm\.|vt\.|m\.)?tiktok\.com\/.+/i.test(url)) {
        return m.reply("Invalid TikTok URL");
    }

    await global.loading(m, sock);

    try {
        const { success, type, images, videoUrl, error } = await tiktok(url);
        if (!success) throw new Error(error || "Failed");

        if (type === "images") {
            if (images.length === 1) {
                await sock.sendMessage(
                    m.chat,
                    {
                        image: {
                            url: images[0],
                        },
                    },
                    { quoted: m }
                );
            } else {
                const album = {
                    album: images.map((img, i) => ({
                        image: { url: img },
                        caption: `${i + 1}/${images.length}`,
                    })),
                };

                await sock.client(m.chat, album, { quoted: m });
            }
        } else if (type === "video") {
            await sock.sendMessage(
                m.chat,
                {
                    video: { url: videoUrl },
                    mimetype: "video/mp4",
                },
                { quoted: m }
            );
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
handler.help = ["tiktok"];
handler.tags = ["downloader"];
handler.command = /^(tiktok|tt)$/i;

export default handler;
