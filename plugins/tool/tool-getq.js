import { BufferJSON } from "baileys";

let handler = async (m, { conn }) => {
    if (!m.quoted) return m.reply("Reply to a message to debug its structure.");
    try {
        const output = inspect(m.quoted);
        await m.reply(output);
    } catch (e) {
        conn.logger.error(e);
        m.reply(`Error: ${e.message}`);
    }
};

handler.help = ["debug"];
handler.tags = ["tool"];
handler.command = /^(getq|q|debug)$/i;
handler.owner = true;

export default handler;

function isByteArray(obj) {
    return (
        typeof obj === "object" &&
        obj !== null &&
        Object.keys(obj).every((k) => /^\d+$/.test(k)) &&
        Object.values(obj).every((v) => typeof v === "number" && v >= 0 && v <= 255)
    );
}

function inspect(obj, depth = 0, seen = new WeakSet()) {
    if (obj === null) return "null";
    if (obj === undefined) return "undefined";
    if (typeof obj !== "object") return JSON.stringify(obj);
    if (seen.has(obj)) return "[Circular]";
    seen.add(obj);
    if (depth > 15) return "[Depth limit reached]";

    const result = {};
    for (const key of Reflect.ownKeys(obj)) {
        try {
            const desc = Object.getOwnPropertyDescriptor(obj, key);
            let value = desc?.get ? desc.get.call(obj) : obj[key];

            if (Buffer.isBuffer(value)) {
                const hex = BufferJSON.toJSON(value)
                    .data.map((v) => v.toString(16).padStart(2, "0"))
                    .join("");
                result[key] = `<Buffer ${hex}>`;
            } else if (isByteArray(value)) {
                const hex = Object.values(value)
                    .map((v) => v.toString(16).padStart(2, "0"))
                    .join("");
                result[key] = `<ByteArray ${hex}>`;
            } else if (typeof value === "function") {
                result[key] = `[Function ${value.name || "anonymous"}]`;
            } else if (typeof value === "object" && value !== null) {
                result[key] = inspect(value, depth + 1, seen);
            } else {
                result[key] = value;
            }
        } catch (e) {
            result[key] = `[Error: ${e.message}]`;
        }
    }

    return depth === 0 ? JSON.stringify(result, null, 2) : result;
}
