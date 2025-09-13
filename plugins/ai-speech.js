
import { vitsSpeech } from "../lib/scrape.js"

let speech = new vitsSpeech()
let handler = async (m, { conn, usedPrefix, command, text }) => {
if (!text) return m.reply(`🍡 *Masukkan teks yang ingin diubah ke suara!*\n\n*Contoh: ${usedPrefix + command} dasar mesum*\n*${usedPrefix + command} aku sayang kamu|suzu*`)
text = text.split("|")
if (!text[1]) {
let res = await fetch('https://raw.githubusercontent.com/naruyaizumi/json/main/speechModel.json')
let data = await res.json()
let result = Object.keys(data.model)
let list = result.map((v, i) => {
return [`${usedPrefix + command} ${text[0]}|${v}`, (i + 1).toString(), data.model[v]]
})
await conn.textList(m.chat, `🍰 Terdapat *${result.length} Model Suara*\nSilakan pilih model yang ingin kamu gunakan yaa~`, false, list, m)
} else {
try {
await global.loading(m, conn)
let res = await fetch(global.API('btz', '/api/tools/translate', {
text: text[1],
lang: 'ja'
}, 'apikey'))
let json = await res.json()
if (!json.status || !json.result) throw '❌ *Gagal menerjemahkan ke bahasa Jepang!*'
let result = await speech.generate(json.result, text[1], 'ja')
await conn.sendMessage(m.chat, {
audio: { url: result.url },
mimetype: 'audio/mpeg',
ptt: true
}, { quoted: m })
} finally {
await global.loading(m, conn, true)
}
}
}

handler.help = ['speech']
handler.tags = ['ai']
handler.command = /^((ai)?speech)$/i
handler.premium = true
handler.register = true

export default handler