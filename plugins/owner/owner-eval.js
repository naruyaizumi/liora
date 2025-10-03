import syntaxerror from "syntax-error";
import { inspect } from "util";

let vcard = `BEGIN:VCARD
VERSION:3.0
N:;ttname;;;
FN:ttname
item1.TEL;waid=13135550002:+1 (313) 555-0002
item1.X-ABLabel:Ponsel
END:VCARD`;

let q = {
    key: {
        fromMe: false,
        participant: "13135550002@s.whatsapp.net",
        remoteJid: "status@broadcast",
    },
    message: {
        contactMessage: {
            displayName: "𝗘 𝗩 𝗔 𝗟",
            vcard,
        },
    },
};

let handler = async (m, { conn, noPrefix, isMods }) => {
    if (!isMods) return;
    let _text = noPrefix;
    let _syntax = "";
    let _return;
    let old = m.exp * 1;
    try {
        if (m.text.startsWith("=>")) {
            _return = await eval(`(async () => { return ${_text} })()`);
        } else {
            _return = await eval(`(async () => { ${_text} })()`);
        }
    } catch (e) {
        let err = syntaxerror(_text, "Eval Function", {
            allowReturnOutsideFunction: true,
            allowAwaitOutsideFunction: true,
            sourceType: "module",
        });
        if (err) _syntax = "```" + err + "```\n\n";
        _return = e;
    } finally {
        await conn.sendMessage(
            m.chat,
            {
                text: _syntax + inspect(_return, { depth: null, maxArrayLength: null }),
            },
            { quoted: q }
        );
        m.exp = old;
    }
};

handler.help = [">", "=>"];
handler.tags = ["owner"];
handler.customPrefix = /^=?> /;
handler.command = /(?:)/i;

export default handler;
