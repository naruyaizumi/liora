
let handler = async (m, { usedPrefix, command, text }) => {
let [mode, ...message] = text.split(" ")
let input = message.join(" ")

if (!mode || !input) return m.reply(`🌸 *Konversi Biner Encode/Decode* 🌿\n\n✨ *Cara Penggunaan:*\n🌿 *Encode:* ${usedPrefix}${command} encode Hello\n🔥 *Decode:* ${usedPrefix}${command} decode 01001000 01101001`)
if (mode.toLowerCase() === "encode") {
let binary = input.split("").map(c => c.charCodeAt(0).toString(2).padStart(8, "0")).join(" ")
return m.reply(`🌸 *Hasil Encode:*\n${binary}`)
}
if (mode.toLowerCase() === "decode") {
let text = input.split(" ").map(b => String.fromCharCode(parseInt(b, 2))).join("")
return m.reply(`🔥 *Hasil Decode:*\n${text}`)
}
m.reply(`🌸 *Mode tidak dikenali! Gunakan encode/decode.*`)
}

handler.help = ["biner"]
handler.tags = ["tools"]
handler.command = /^(biner|binary)$/i
handler.register = true

export default handler