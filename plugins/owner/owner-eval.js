let handler = async (m, { conn, noPrefix, isOwner }) => {
    if (!isOwner) return;
    let _text = noPrefix;
    let _return;

    try {
        if (m.text.startsWith("=>")) {
            _return = await eval(`(async () => { return ${_text} })()`);
        } else {
            _return = await eval(`(async () => { ${_text} })()`);
        }
    } catch (e) {
        _return = e;
    }

    let output;
    if (
        Array.isArray(_return) &&
        _return.every((item) => item && typeof item === "object" && !Array.isArray(item))
    ) {
        output = Bun.inspect(_return, { depth: null, maxArrayLength: null });
    } else if (typeof _return === "string") {
        output = _return;
    } else {
        output = Bun.inspect(_return, { depth: null, maxArrayLength: null });
    }

    await conn.sendMessage(m.chat, { text: output });
};

handler.help = [">", "=>"];
handler.tags = ["owner"];
handler.customPrefix = /^=?> /;
handler.command = /(?:)/i;

export default handler;
