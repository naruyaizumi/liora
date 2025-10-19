import { inspect } from "util";

let handler = async (m, { conn, noPrefix, isMods }) => {
    if (!isMods) return;
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

    if (_return === undefined) return;

    const output =
        typeof _return === "string"
            ? _return
            : inspect(_return, { depth: null, maxArrayLength: null });

    await conn.sendMessage(m.chat, { text: output });
};

handler.help = [">", "=>"];
handler.tags = ["owner"];
handler.customPrefix = /^=?> /;
handler.command = /(?:)/i;

export default handler;
