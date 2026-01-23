/**
 * @file YouTube search command handler
 * @module plugins/internet/yts
 * @license Apache-2.0
 * @author Naruya Izumi
 */

/**
 * Searches for videos on YouTube
 * @async
 * @function handler
 * @param {Object} m - Message object
 * @param {Object} sock - Connection object
 * @param {string} text - Search query
 * @param {string} usedPrefix - Command prefix used
 * @param {string} command - Command name
 * @returns {Promise<void>}
 *
 * @description
 * Command to search for videos on YouTube using the nekolabs API.
 * Returns search results with interactive video selection interface.
 *
 * @features
 * - Searches YouTube videos using external API
 * - Displays video title, channel, and duration
 * - Shows video cover images
 * - Interactive selection interface
 * - Handles empty results gracefully
 */

import { canvas } from "#canvas/yts.js";

let handler = async (m, { sock, text, usedPrefix, command }) => {
    if (!text) {
        return m.reply(`Need query\nEx: ${usedPrefix + command} neck deep`);
    }

    try {
        await global.loading(m, sock);

        const url = `https://api.nekolabs.web.id/discovery/youtube/search?q=${encodeURIComponent(text)}`;
        const res = await fetch(url);

        if (!res.ok) {
            throw new Error(`API failed: ${res.statusText}`);
        }

        const data = await res.json();

        if (!data.success || !Array.isArray(data.result)) {
            throw new Error("Invalid API response");
        }

        const vids = data.result;

        if (vids.length === 0) {
            return m.reply(`No results for "${text}"`);
        }

        const imageBuffer = await canvas(vids, text);

        const rows = vids.map((v, i) => ({
            header: `Result ${i + 1}`,
            title: v.title,
            description: `${v.channel} • ${v.duration || "-"}`,
            id: `.play ${v.title}`,
        }));

        await sock.client(m.chat, {
            image: imageBuffer,
            caption: "*Select video above*",
            title: "YouTube Search",
            footer: `Found ${vids.length} results`,
            interactiveButtons: [
                {
                    name: "single_select",
                    buttonParamsJson: JSON.stringify({
                        title: "Select Video",
                        sections: [
                            {
                                title: `Results (${vids.length})`,
                                rows: rows,
                            },
                        ],
                    }),
                },
            ],
            hasMediaAttachment: true,
        });
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
handler.help = ["yts"];
handler.tags = ["internet"];
handler.command = /^(yts)$/i;

export default handler;
