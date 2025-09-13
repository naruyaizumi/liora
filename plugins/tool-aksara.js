
let handler = async (m, { conn, usedPrefix, command, text }) => {
let aksaraJawa = {
"A": "ꦄ", "B": "ꦧ", "C": "ꦕ", "D": "ꦢ", "E": "ꦌ", "F": "ꦥ꦳", 
"G": "ꦒ", "H": "ꦲ", "I": "ꦆ", "J": "ꦗ", "K": "ꦏ", "L": "ꦭ", 
"M": "ꦩ", "N": "ꦤ", "O": "ꦎ", "P": "ꦥ", "Q": "ꦐ", "R": "ꦫ", 
"S": "ꦱ", "T": "ꦠ", "U": "ꦈ", "V": "ꦮ꦳", "W": "ꦮ", "X": "ꦼꦲ", 
"Y": "ꦪ", "Z": "ꦗ꦳", " ": " "
}
let latinJawa = Object.fromEntries(Object.entries(aksaraJawa).map(([a, b]) => [b, a]))
let [mode, ...message] = text.split(" ")
if (!mode || !message.length) return m.reply(`🎴 *Konversi Aksara Jawa* 🎴\n\n🍡 *Cara Penggunaan:*\n📌 *Ke Aksara Jawa:* \`${usedPrefix}${command} jawa Halo Dunia\`\n📌 *Ke Latin:* \`${usedPrefix}${command} latin ꦲꦭꦺꦴ ꦢꦸꦤꦶꦪ\``)
let result = mode.toLowerCase() === "jawa"
? message.join(" ").toUpperCase().split("").map(c => aksaraJawa[c] || c).join("")
: message.join("").split("").map(c => latinJawa[c] || c).join("")
m.reply(`🎴 *Hasil:* 🎴\n${result}`)
}

handler.help = ["aksara"]
handler.tags = ["tools"]
handler.command = /^(aksara)$/i
handler.register = true

export default handler