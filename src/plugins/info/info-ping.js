/**
 * @file Ping command handler
 * @module plugins/info/ping
 * @license Apache-2.0
 * @author Naruya Izumi
 */

/**
 * Measures bot response latency in milliseconds
 * @async
 * @function handler
 * @param {Object} m - Message object
 * @param {Object} sock - Connection object
 * @returns {Promise<void>}
 *
 * @description
 * Command to measure and display the bot's response latency in milliseconds.
 * Calculates the time taken to send and edit a message, showing network and processing speed.
 *
 * @features
 * - Measures response latency in nanoseconds and milliseconds
 * - Uses Bun.nanoseconds() for high-precision timing
 * - Edits message to show final ping result
 * - Simple and efficient implementation
 */

let handler = async (m, { sock }) => {
    const start = Bun.nanoseconds();
    const msg = await sock.sendMessage(m.chat, { text: "" });
    const ns = Bun.nanoseconds() - start;
    const ms = (ns / 1_000_000).toFixed(0);
    await sock.sendMessage(m.chat, {
        text: `${ms} ms`,
        edit: msg.key,
    });
};

/**
 * Command metadata for help system
 * @property {Array<string>} help - Help text
 * @property {Array<string>} tags - Command categories
 * @property {RegExp} command - Command pattern matching
 */
handler.help = ["ping"];
handler.tags = ["info"];
handler.command = /^(ping)$/i;

export default handler;
