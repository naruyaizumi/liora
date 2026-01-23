/**
 * @file Spotify search command handler
 * @module plugins/internet/spsearch
 * @license Apache-2.0
 * @author Naruya Izumi
 */

/**
 * Searches for tracks on Spotify
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
 * Command to search for music tracks on Spotify using the nekolabs API.
 * Returns search results with interactive track selection interface.
 *
 * @features
 * - Searches Spotify tracks using external API
 * - Displays track title, artist, and duration
 * - Shows track cover images
 * - Interactive selection interface
 * - Handles empty results gracefully
 */

import { canvas } from "#canvas/spsearch.js";

let handler = async (m, { sock, text, usedPrefix, command }) => {
    if (!text) {
        return m.reply(`Need query\nEx: ${usedPrefix + command} for revenge`);
    }

    try {
        await global.loading(m, sock);

        const url = `https://api.nekolabs.web.id/discovery/spotify/search?q=${encodeURIComponent(text)}`;
        const res = await fetch(url);

        if (!res.ok) {
            throw new Error(`API failed: ${res.statusText}`);
        }

        const data = await res.json();

        if (!data.success || !Array.isArray(data.result)) {
            throw new Error("Invalid API response");
        }

        const tracks = data.result;

        if (tracks.length === 0) {
            return m.reply(`No results for "${text}"`);
        }

        const imageBuffer = await canvas(tracks, text);

        const rows = tracks.map((t, i) => ({
            header: `Track ${i + 1}`,
            title: t.title,
            description: `${t.artist} • ${t.duration || "-"}`,
            id: `.spotify ${t.title}`,
        }));

        await sock.client(m.chat, {
            image: imageBuffer,
            caption: "*Select track above*",
            title: "Spotify Search",
            footer: `Found ${tracks.length} results`,
            interactiveButtons: [
                {
                    name: "single_select",
                    buttonParamsJson: JSON.stringify({
                        title: "Select Track",
                        sections: [
                            {
                                title: `Results (${tracks.length})`,
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
handler.help = ["spsearch"];
handler.tags = ["internet"];
handler.command = /^(spsearch)$/i;

export default handler;
