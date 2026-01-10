/**
 * @file Spotify downloader command handler
 * @module plugins/downloader/spotify
 * @license Apache-2.0
 * @author Naruya Izumi
 */

/**
 * Downloads audio from Spotify by searching for track
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
 * Searches for and downloads Spotify tracks by song title or artist.
 * Returns audio with rich metadata including title, artist, and album art.
 *
 * @features
 * - Searches Spotify by song title or artist
 * - Downloads audio with metadata preservation
 * - Displays album art and artist info
 * - Shows loading indicators during processing
 */

import { spotify } from "#api/spotify.js";

let handler = async (m, { conn, args, usedPrefix, command }) => {
    if (!args[0]) {
        return m.reply(`Need song title\nEx: ${usedPrefix + command} Swim`);
    }

    await global.loading(m, conn);

    try {
        const res = await spotify(args.join(" "));

        if (!res?.success) {
            throw new Error(res?.error || "No audio");
        }

        const { title, channel, cover, url, downloadUrl } = res;

        if (!downloadUrl) {
            throw new Error("No download URL");
        }

        await conn.sendMessage(
            m.chat,
            {
                audio: {
                    url: downloadUrl,
                },
                mimetype: "audio/mpeg",
                contextInfo: {
                    externalAdReply: {
                        title,
                        body: channel,
                        thumbnailUrl: cover,
                        mediaUrl: url,
                        mediaType: 1,
                        renderLargerThumbnail: true,
                    },
                },
            },
            { quoted: m }
        );
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
handler.help = ["spotify"];
handler.tags = ["downloader"];
handler.command = /^(spotify)$/i;

export default handler;
