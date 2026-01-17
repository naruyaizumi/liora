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
import { convert } from "#lib/convert.js";
import { spotify } from "#api/spotify.js";
import { canvas } from "#canvas/spotify.js";

let handler = async (m, { conn, args, usedPrefix, command }) => {
    if (!args[0]) return m.reply(`Need song title\nEx: ${usedPrefix + command} Swim`);

    await global.loading(m, conn);
    try {
        const { success, title, channel, cover, url, downloadUrl, duration, error } = await spotify(
            args.join(" ")
        );
        if (!success) throw new Error(error);

        const canvasBuffer = await canvas(cover, title, channel, duration);

        const audioRes = await fetch(downloadUrl);
        if (!audioRes.ok) throw new Error("No download URL");

        const audioBuffer = Buffer.from(await audioRes.arrayBuffer());

        const converted = await convert(audioBuffer, {
            format: "opus",
            bitrate: "128k",
            channels: 1,
            sampleRate: 48000,
            ptt: false,
        });

        const finalBuffer =
            converted instanceof Buffer
                ? converted
                : converted?.buffer
                  ? Buffer.from(converted.buffer)
                  : converted?.data
                    ? Buffer.from(converted.data)
                    : Buffer.from(converted);

        await conn.sendMessage(
            m.chat,
            {
                audio: finalBuffer,
                mimetype: "audio/ogg; codecs=opus",
                ptt: true,
                contextInfo: {
                    externalAdReply: {
                        title,
                        body: channel,
                        thumbnail: canvasBuffer,
                        mediaUrl: url,
                        mediaType: 1,
                        renderLargerThumbnail: true,
                    },
                },
            },
            { quoted: m }
        );
    } catch (e) {
        global.logger.error(e);
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
