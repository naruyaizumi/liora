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
    await sock.sendMessage(m.chat, { text: "PONG 🏓" });
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
