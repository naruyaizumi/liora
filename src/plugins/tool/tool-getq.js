/**
 * @file Message debugger and inspector command handler
 * @module plugins/tool/debug
 * @license Apache-2.0
 * @author Naruya Izumi
 */

import { BufferJSON } from "baileys";

/**
 * Debugs and inspects quoted message structure
 * @async
 * @function handler
 * @param {Object} m - Message object
 * @returns {Promise<void>}
 *
 * @description
 * Command to debug and inspect the internal structure of quoted messages.
 * Useful for developers to understand message object hierarchy.
 *
 * @features
 * - Inspects quoted message structure
 * - Handles Buffer and ByteArray types
 * - Detects circular references
 * - Limits recursion depth for safety
 * - Formats output as pretty JSON
 */

let handler = async (m) => {
    if (!m.quoted) return m.reply("Reply to a message to debug.");
    try {
        const out = inspect(m.quoted);
        await m.reply(out);
    } catch (e) {
        global.logger.error(e);
        m.reply(`Error: ${e.message}`);
    }
};

/**
 * Checks if object is a ByteArray
 * @function isByteArray
 * @param {Object} obj - Object to check
 * @returns {boolean} True if ByteArray
 */
function isByteArray(obj) {
    return (
        typeof obj === "object" &&
        obj !== null &&
        Object.keys(obj).every((k) => /^\d+$/.test(k)) &&
        Object.values(obj).every((v) => typeof v === "number" && v >= 0 && v <= 255)
    );
}

/**
 * Recursively inspects object structure
 * @function inspect
 * @param {Object} obj - Object to inspect
 * @param {number} depth - Current recursion depth
 * @param {WeakSet} seen - Set of already seen objects
 * @returns {string|Object} Formatted inspection result
 */
function inspect(obj, depth = 0, seen = new WeakSet()) {
    if (obj === null) return "null";
    if (obj === undefined) return "undefined";
    if (typeof obj !== "object") return JSON.stringify(obj);
    if (seen.has(obj)) return "[Circular]";
    seen.add(obj);
    if (depth > 15) return "[Depth limit reached]";

    const res = {};
    for (const key of Reflect.ownKeys(obj)) {
        try {
            const desc = Object.getOwnPropertyDescriptor(obj, key);
            let val = desc?.get ? desc.get.call(obj) : obj[key];

            if (Buffer.isBuffer(val)) {
                const hex = BufferJSON.toJSON(val)
                    .data.map((v) => v.toString(16).padStart(2, "0"))
                    .join("");
                res[key] = `<Buffer ${hex}>`;
            } else if (isByteArray(val)) {
                const hex = Object.values(val)
                    .map((v) => v.toString(16).padStart(2, "0"))
                    .join("");
                res[key] = `<ByteArray ${hex}>`;
            } else if (typeof val === "function") {
                res[key] = `[Function ${val.name || "anon"}]`;
            } else if (typeof val === "object" && val !== null) {
                res[key] = inspect(val, depth + 1, seen);
            } else {
                res[key] = val;
            }
        } catch (e) {
            res[key] = `[Error: ${e.message}]`;
        }
    }

    return depth === 0 ? JSON.stringify(res, null, 2) : res;
}

/**
 * Command metadata for help system
 * @property {Array<string>} help - Help text
 * @property {Array<string>} tags - Command categories
 * @property {RegExp} command - Command pattern matching
 * @property {boolean} owner - Owner-only command
 */
handler.help = ["debug"];
handler.tags = ["tool"];
handler.command = /^(q|debug)$/i;
handler.owner = true;

export default handler;
