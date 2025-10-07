import cp, { exec as _exec } from "child_process"
import { promisify } from "util"

const exec = promisify(_exec).bind(cp)
const dangerousCommands = [
  "rm -rf /",
  "rm -rf *",
  "rm --no-preserve-root -rf /",
  "mkfs.ext4",
  "dd if=",
  "chmod 777 /",
  "chown root:root /",
  "mv /",
  "cp /",
  "shutdown",
  "reboot",
  "poweroff",
  "halt",
  "kill -9 1",
  ">:(){ :|: & };:",
]

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
      displayName: "𝗘 𝗫 𝗘 𝗖",
      vcard,
    },
  },
}

const handler = async (m, { conn, isMods, command, text }) => {
  if (!isMods) return
  if (!command || !text) return

  if (dangerousCommands.some((cmd) => text.trim().startsWith(cmd))) {
    return conn.sendMessage(
      m.chat,
      {
        text: `⚠️ Command blocked for security reasons.\n> ${text.trim()}`,
      },
      { quoted: q },
    )
  }

  let output
  try {
    output = await exec(command.trimStart() + " " + text.trimEnd())
  } catch (error) {
    output = error
  }

  const { stdout, stderr } = output
  const timestamp = new Date().toTimeString().split(" ")[0]

  const message = [
    "```",
    `=== [${timestamp}] EXEC ===`,
    `$ ${command.trimStart()} ${text.trimEnd()}`,
    "────────────────────────",
    stdout?.trim()
      ? stdout
          .trim()
          .split("\n")
          .map((line) => `> ${line}`)
          .join("\n")
      : stderr?.trim()
      ? stderr
          .trim()
          .split("\n")
          .map((line) => `! ${line}`)
          .join("\n")
      : "> (no output)",
    "```",
  ].join("\n")

  await conn.sendMessage(m.chat, { text: message }, { quoted: q })
}

handler.help = ["$"]
handler.tags = ["owner"]
handler.customPrefix = /^[$] /
handler.command = new RegExp()

export default handler