import { inspect } from "util"

let vcard = `BEGIN:VCARD
VERSION:3.0
N:;ttname;;;
FN:ttname
item1.TEL;waid=13135550002:+1 (313) 555-0002
item1.X-ABLabel:Ponsel
END:VCARD`

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
}

let handler = async (m, { conn, noPrefix, isMods }) => {
  if (!isMods) return
  let _text = noPrefix
  let _return
  let old = m.exp * 1
  const timestamp = new Date().toTimeString().split(" ")[0]

  try {
    if (m.text.startsWith("=>")) {
      _return = await eval(`(async () => { return ${_text} })()`)
    } else {
      _return = await eval(`(async () => { ${_text} })()`)
    }
  } catch (e) {
    _return = e
  }

  const output =
    typeof _return === "string"
      ? _return
      : inspect(_return, { depth: null, maxArrayLength: null })

  const message = [
    "```",
    `=== [${timestamp}] EVAL ===`,
    `$ ${_text}`,
    "────────────────────────",
    output
      ? output
          .split("\n")
          .map((line) => `> ${line}`)
          .join("\n")
      : "> (no output)",
    "```",
  ].join("\n")

  await conn.sendMessage(m.chat, { text: message }, { quoted: q })
  m.exp = old
}

handler.help = [">", "=>"]
handler.tags = ["owner"]
handler.customPrefix = /^=?> /
handler.command = /(?:)/i

export default handler