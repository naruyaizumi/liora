/**
 * @file YouTube Music downloader command handler
 * @module plugins/downloader/play
 * @license Apache-2.0
 * @author Naruya Izumi
 */

/**
 * Searches and downloads audio from YouTube Music
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
 * Searches for and downloads audio from YouTube Music by song title.
 * Returns audio with metadata including title, artist, and album art.
 *
 * @features
 * - Searches YouTube Music by song title
 * - Downloads audio with metadata preservation
 * - Displays album art and artist info in rich preview
 * - Shows loading indicators during processing
 */
import { play } from "#api/play.js";
import { canvas } from "#canvas/play.js";

let handler = async (m, { sock, args, usedPrefix, command }) => {
    if (!args[0]) return m.reply(`Need song title\nEx: ${usedPrefix + command} Bye`);

    await global.loading(m, sock);
    try {
        const { success, title, channel, cover, url, downloadUrl, error } = await play(
            args.join(" ")
        );
        if (!success) throw new Error(error);

        const canvasBuffer = await canvas(cover, title, channel);

        await sock.sendMessage(
            m.chat,
            {
                audio: { url: downloadUrl },
                mimetype: "audio/mpeg",
                contextInfo: {
                    externalAdReply: {
                        title,
                        body: channel,
                        thumbnail: canvasBuffer,
                        mediaUrl: url,
                        mediaType: 2,
                        renderLargerThumbnail: true,
                        showAdAttribution: true,
                        sourceUrl: "https://m.youtube.com",
                    },
                },
            },
            { quoted: m }
        );
    } catch (e) {
        global.logger.error(e);
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
handler.help = ["play"];
handler.tags = ["downloader"];
handler.command = /^(play)$/i;

export default handler;