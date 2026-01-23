/**
 * @file Eval (evaluation) command handler
 * @module plugins/owner/eval
 * @license Apache-2.0
 * @author Naruya Izumi
 */

/**
 * Evaluates JavaScript code with owner-only access
 * @async
 * @function handler
 * @param {Object} m - Message object
 * @param {Object} param1 - Destructured parameters
 * @param {Object} param1.sock - Connection object
 * @param {string} param1.noPrefix - Message text without prefix
 * @param {boolean} param1.isOwner - Whether user is bot owner
 * @returns {Promise<void>}
 *
 * @description
 * Command to evaluate JavaScript code in the bot's runtime environment.
 * Supports both expression evaluation (=>) and statement execution.
 *
 * @features
 * - Evaluates JavaScript code in bot context
 * - Supports expression evaluation with "=>" prefix
 * - Handles both statements and expressions
 * - Uses Bun.inspect for object visualization
 * - Only accessible by bot owner
 * - Custom prefix pattern for evaluation
 */

let handler = async (m, { sock, noPrefix, isOwner }) => {
    if (!isOwner) return;
    let t = noPrefix;
    let r;

    try {
        if (m.text.startsWith("=>")) {
            r = await eval(`(async () => { return ${t} })()`);
        } else {
            r = await eval(`(async () => { ${t} })()`);
        }
    } catch (e) {
        r = e;
    }

    let out;
    if (Array.isArray(r) && r.every((i) => i && typeof i === "object" && !Array.isArray(i))) {
        out = Bun.inspect(r, { depth: null, maxArrayLength: null });
    } else if (typeof r === "string") {
        out = r;
    } else {
        out = Bun.inspect(r, { depth: null, maxArrayLength: null });
    }

    await sock.sendMessage(m.chat, { text: out });
};

/**
 * Custom prefix pattern for evaluation commands
 * @property {RegExp} customPrefix - Pattern matching evaluation commands
 */
handler.customPrefix = /^=?> /;

/**
 * Command metadata for help system
 * @property {RegExp} command - Command pattern matching
 */
handler.command = /(?:)/i;

export default handler;
