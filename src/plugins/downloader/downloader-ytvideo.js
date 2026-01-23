/**
 * @file YouTube to MP4 downloader command handler
 * @module plugins/downloader/ytmp4
 * @license Apache-2.0
 * @author Naruya Izumi
 */

/**
 * Downloads YouTube videos in MP4 format
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
 * Downloads YouTube videos as MP4 files. Supports various YouTube URL formats
 * including regular videos, shorts, and live streams.
 *
 * @features
 * - Downloads YouTube videos in MP4 format
 * - Supports multiple YouTube URL formats (youtube.com, youtu.be)
 * - Requests 720p quality where available
 * - Shows loading indicators during download
 */

import { ytmp4 } from "#api/ytmp4.js";

let handler = async (m, { sock, args, usedPrefix, command }) => {
    if (!args[0]) {
        return m.reply(`Need YouTube URL\nEx: ${usedPrefix + command} https://youtu.be/xxx`);
    }

    const url = args[0];
    const yt =
        /^(https?:\/\/)?((www|m)\.)?(youtube(-nocookie)?\.com\/(watch\?v=|shorts\/|live\/)|youtu\.be\/)[\w-]+(\S+)?$/i;
    if (!yt.test(url)) {
        return m.reply("Invalid YouTube URL");
    }

    await global.loading(m, sock);

    try {
        const { success, downloadUrl, error } = await ytmp4(url);
        if (!success) throw new Error(error);

        await sock.sendMessage(
            m.chat,
            {
                video: { url: downloadUrl },
                mimetype: "video/mp4",
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
handler.help = ["ytmp4"];
handler.tags = ["downloader"];
handler.command = /^(ytmp4)$/i;

export default handler;
