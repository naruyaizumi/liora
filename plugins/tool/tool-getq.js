let handler = async (m) => {
    if (!m.quoted) return m.reply("Reply to a message to debug its structure.");
    try {
        const output = inspectDeep(m.quoted);
        await m.reply(output);
    } catch (e) {
        console.error(e);
        await m.reply("Error: " + e.message);
    }
};

handler.help = ["debug"];
handler.tags = ["tool"];
handler.command = /^(getq|q|debug)$/i;
handler.mods = true;

export default handler;

function inspectDeep(obj, depth = 0, seen = new WeakSet()) {
    if (obj === null) return "null";
    if (obj === undefined) return "undefined";
    if (Buffer.isBuffer(obj)) return `<Buffer length=${obj.length}>`;
    if (typeof obj !== "object") return JSON.stringify(obj);
    if (seen.has(obj)) return "[Circular]";
    seen.add(obj);
    if (depth > 6) return "[Depth limit reached]";
    const result = {};
    for (const key of Reflect.ownKeys(obj)) {
        try {
            const desc = Object.getOwnPropertyDescriptor(obj, key);
            let value;
            if (desc?.get) {
                value = desc.get.call(obj);
            } else {
                value = obj[key];
            }
            if (typeof value === "object" && value !== null) {
                result[key] = inspectDeep(value, depth + 1, seen);
            } else {
                if (Buffer.isBuffer(value)) result[key] = `<Buffer length=${value.length}>`;
                else if (typeof value === "function") result[key] = `[Function ${value.name || "anonymous"}]`;
                else result[key] = value;
            }
        } catch (err) {
            result[key] = `[Error: ${err.message}]`;
        }
    }

    return depth === 0 ? JSON.stringify(result, null, 2) : result;
}