/**
 * @file Copilot AI chat command handler
 * @module plugins/ai/copilot
 * @license Apache-2.0
 * @author Naruya Izumi
 */

/**
 * Interacts with Microsoft Copilot AI for text generation
 * @async
 * @function handler
 * @param {Object} m - Message object
 * @param {Object} sock - Connection object
 * @param {string} text - User query/prompt
 * @returns {Promise<void>}
 *
 * @description
 * Command to interact with Microsoft Copilot AI for text generation and conversation.
 * Uses the nekolabs API to access Copilot's capabilities.
 *
 * @features
 * - Interacts with Microsoft Copilot AI
 * - Supports natural language conversations
 * - Returns formatted AI responses
 * - Handles API errors gracefully
 */

let handler = async (m, { sock, text }) => {
    if (!text) return m.reply("Ask something to Copilot AI");

    try {
        await global.loading(m, sock);

        const api = `https://api.nekolabs.web.id/text-generation/copilot?text=${encodeURIComponent(text)}`;
        const res = await fetch(api);
        if (!res.ok) return m.reply("API error");

        const json = await res.json();
        const reply = json?.result?.text;

        if (!reply) return m.reply("No response");

        await sock.sendMessage(m.chat, { text: `Copilot:\n${reply.trim()}` }, { quoted: m });
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
handler.help = ["copilot"];
handler.tags = ["ai"];
handler.command = /^(copilot)$/i;

export default handler;
