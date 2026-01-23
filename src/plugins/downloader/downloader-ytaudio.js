/**
 * @file YouTube to MP3 converter command handler
 * @module plugins/downloader/ytmp3
 * @license Apache-2.0
 * @author Naruya Izumi
 */

/**
 * Converts YouTube videos to MP3 audio
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
 * Converts YouTube videos to MP3 audio files. Supports various YouTube URL formats
 * including regular videos, shorts, and live streams.
 *
 * @features
 * - Converts YouTube videos to MP3 audio
 * - Supports multiple YouTube URL formats (youtube.com, youtu.be, music.youtube.com)
 * - Validates URL format before processing
 * - Shows loading indicators during conversion
 */

import { ytmp3 } from "#api/ytmp3.js";

let handler = async (m, { sock, args, usedPrefix, command }) => {
    if (!args[0]) {
        return m.reply(`Need YouTube URL\nEx: ${usedPrefix + command} https://youtu.be/xxx`);
    }

    const url = args[0];
    const yt =
        /^(https?:\/\/)?((www|m|music)\.)?(youtube(-nocookie)?\.com\/(watch\?v=|shorts\/|live\/)|youtu\.be\/)[\w-]+(\S+)?$/i;
    if (!yt.test(url)) {
        return m.reply("Invalid YouTube URL");
    }

    await global.loading(m, sock);

    try {
        const { success, downloadUrl, error } = await ytmp3(url);
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
handler.help = ["ytmp3"];
handler.tags = ["downloader"];
handler.command = /^(ytmp3)$/i;

export default handler;
