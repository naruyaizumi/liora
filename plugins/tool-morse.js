
let handler = async (m, { conn, usedPrefix, command, text }) => {
let morseMap = {
"A": "•-", "B": "-•••", "C": "-•-•", "D": "-••", "E": "•", "F": "••-•",
"G": "--•", "H": "••••", "I": "••", "J": "•---", "K": "-•-", "L": "•-••",
"M": "--", "N": "-•", "O": "---", "P": "•--•", "Q": "--•-", "R": "•-•",
"S": "•••", "T": "-", "U": "••-", "V": "•••-", "W": "•--", "X": "-••-",
"Y": "-•--", "Z": "--••", "0": "-----", "1": "•----", "2": "••---",
"3": "•••--", "4": "••••-", "5": "•••••", "6": "-••••", "7": "--•••",
"8": "---••", "9": "----•", "?": "••--••", "!": "-•-•--", ".": "•-•-•-",
",": "--••--", ";": "-•-•-•", ":": "---•••", "+": "•-•-•", "-": "-••••-",
"/": "-••-•", "=": "-•••-", " ": "/"
}

let reverseMorseMap = Object.fromEntries(Object.entries(morseMap).map(([a, b]) => [b, a]))
let [mode, ...message] = text.split(" ")

if (!mode || !message.length) return m.reply(`🌸 *Kode Morse: Encode & Decode* 🌸\n\n🍡 *Cara Penggunaan:*\n📌 *Encode:* \`${usedPrefix}${command} encode Halo Dunia\`\n📌 *Decode:* \`${usedPrefix}${command} decode •••• •- •-•• --- / -•• ••- -• ••- -•-•\``)

let result = mode.toLowerCase() === "encode"
? message.join(" ").toUpperCase().split("").map(c => morseMap[c] || c).join(" ")
: message.join(" ").split(" ").map(m => reverseMorseMap[m] || m).join("")

m.reply(`🌸 *Hasil:* 🌸\n${result}`)
}

handler.help = ["morse"]
handler.tags = ["tools"]
handler.command = /^(morse)$/i
handler.register = true

export default handler