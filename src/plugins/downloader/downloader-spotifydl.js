/**
 * @file Spotify direct URL downloader command handler
 * @module plugins/downloader/spotifydl
 * @license Apache-2.0
 * @author Naruya Izumi
 */

/**
 * Downloads audio directly from Spotify track URLs
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
 * Downloads audio directly from Spotify track URLs without search.
 * Converts Spotify links to downloadable audio files.
 *
 * @features
 * - Direct Spotify URL processing
 * - Validates URL format before processing
 * - Downloads audio without metadata
 * - Shows loading indicators during processing
 */

import { spotifydl } from "#api/spotifydl.js";

let handler = async (m, { sock, args, usedPrefix, command }) => {
    if (!args[0]) {
        return m.reply(
            `Need Spotify URL\nEx: ${usedPrefix + command} https://open.spotify.com/track/xxx`
        );
    }

    const url = args[0];
    const spotify = /^https?:\/\/open\.spotify\.com\/track\/[\w-]+(\?.*)?$/i;
    if (!spotify.test(url)) {
        return m.reply("Invalid Spotify URL");
    }

    await global.loading(m, sock);

    try {
        const { success, downloadUrl, error } = await spotifydl(url);
        if (!success) throw new Error(error);

        await sock.sendMessage(
            m.chat,
            {
                audio: { url: downloadUrl },
                mimetype: "audio/mpeg",
            },
            { quoted: m }
        );
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
handler.help = ["spotifydl"];
handler.tags = ["downloader"];
handler.command = /^(spotifydl)$/i;

export default handler;
