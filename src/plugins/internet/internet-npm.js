/**
 * @file NPM package search command handler
 * @module plugins/internet/npmsearch
 * @license Apache-2.0
 * @author Naruya Izumi
 */

/**
 * Searches for NPM packages by name
 * @async
 * @function handler
 * @param {Object} m - Message object
 * @param {Object} conn - Connection object
 * @param {string} text - Package name to search
 * @param {string} usedPrefix - Command prefix used
 * @param {string} command - Command name
 * @returns {Promise<void>}
 * 
 * @description
 * Command to search for packages on the NPM registry.
 * Returns top 10 search results with package names, versions, and NPM links.
 * 
 * @features
 * - Searches NPM registry using official API
 * - Returns top 10 search results
 * - Shows package name and version
 * - Includes NPM package links
 * - Handles no results gracefully
 */

let handler = async (m, { conn, text, usedPrefix, command }) => {
    try {
        if (!text) {
            return m.reply(`Need package\nEx: ${usedPrefix + command} baileys`);
        }

        await global.loading(m, conn);

        const res = await fetch(
            `https://registry.npmjs.com/-/v1/search?text=${encodeURIComponent(text)}`
        );
        const { objects } = await res.json();

        if (!objects.length) {
            return m.reply(`No results for "${text}"`);
        }

        const list = objects.slice(0, 10);
        const result = [
            `NPM Search: "${text}"`,
            "",
            ...list.map(
                ({ package: p }, i) => `${i + 1}. ${p.name} (v${p.version})\n    ↳ ${p.links.npm}`
            ),
        ].join("\n");

        await conn.sendMessage(m.chat, { text: result }, { quoted: m });
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
handler.help = ["npmsearch"];
handler.tags = ["internet"];
handler.command = /^(npm(js|search)?)$/i;

export default handler;