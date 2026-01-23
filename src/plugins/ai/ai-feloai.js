/**
 * @file Felo AI chat command handler
 * @module plugins/ai/feloai
 * @license Apache-2.0
 * @author Naruya Izumi
 */

/**
 * Interacts with Felo AI for text generation with source citations
 * @async
 * @function handler
 * @param {Object} m - Message object
 * @param {Object} sock - Connection object
 * @param {string} text - User query/prompt
 * @param {string} usedPrefix - Command prefix used
 * @param {string} command - Command name
 * @returns {Promise<void>}
 *
 * @description
 * Command to interact with Felo AI for text generation with source citations.
 * Returns AI responses along with sources used for information verification.
 *
 * @features
 * - Interacts with Felo AI
 * - Includes source citations for information
 * - Shows up to 10 sources with titles and URLs
 * - Returns formatted AI responses
 * - Handles API errors gracefully
 */

let handler = async (m, { sock, text, usedPrefix, command }) => {
    if (!text) return m.reply(`Ask Felo AI\nEx: ${usedPrefix + command} what's today date`);

    try {
        await global.loading(m, sock);

        const api = `https://api.nekolabs.web.id/text-generation/feloai?text=${encodeURIComponent(text)}`;
        const res = await fetch(api);
        if (!res.ok) return m.reply("API error");

        const json = await res.json();
        const result = json?.result;
        const reply = result?.text;

        if (!reply) return m.reply("No response");

        let src = "";
        if (Array.isArray(result?.sources) && result.sources.length > 0) {
            src =
                "\n\n*Sources:*\n" +
                result.sources
                    .slice(0, 10)
                    .map((s) => `${s.index}. ${s.title || "Untitled"}\n${s.url}`)
                    .join("\n\n");
        }

        await sock.sendMessage(m.chat, { text: `Felo AI:\n${reply.trim()}${src}` }, { quoted: m });
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
handler.help = ["feloai"];
handler.tags = ["ai"];
handler.command = /^(feloai)$/i;

export default handler;
