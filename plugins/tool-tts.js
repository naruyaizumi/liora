
const languages = [
["id-ID", "🇮🇩 Indonesia"],
["en-US", "🇺🇸 English"],
["ja-JP", "🇯🇵 Japanese"],
["fr-FR", "🇫🇷 French"],
["fil-PH", "🇵🇭 Filipino"],
["my-MM", "🇲🇲 Burmese"],
["de-DE", "🇩🇪 German"],
["it-IT", "🇮🇹 Italian"],
["ko-KR", "🇰🇷 Korean"],
["th-TH", "🇹🇭 Thai"],
["hi-IN", "🇮🇳 Hindi"],
["ru-RU", "🇷🇺 Russian"]
]

let ttsQueue = {}

let handler = async (m, { conn, args, usedPrefix, command }) => {
if (!args[0]) return m.reply(`🍬 *Masukkan teks untuk diubah menjadi suara!*\n\n🍭 *Contoh: ${usedPrefix + command} Naruya Izumi*`)
let text = args.join(" ")
ttsQueue[m.sender] = text
let list = languages.map(([code, name], i) => [code, (i + 1).toString(), name])
await conn.textList(m.chat, `🍓 Pilih Bahasa untuk TTS\n\n🧁 Teks: "${text}"`, false, list, m)
}

handler.before = async (m, { conn }) => {
let userId = m.sender
if (!ttsQueue[userId]) return
let langCode = m.text.trim()
let selected = languages.find(([code]) => code === langCode)
if (!selected) return
let text = ttsQueue[userId]
delete ttsQueue[userId]
await global.loading(m, conn)
try {
let apiUrl = global.API("btz", "/api/sound/texttosound", { text1: text, lang: selected[0] }, "apikey")
let res = await fetch(apiUrl)
if (!res.ok) throw new Error(`Respon HTTP error: ${res.status}`)
let json = await res.json()
if (!json.status || !json.result) throw new Error("🍩 *Gagal mengambil URL audio dari API!*")
let audioRes = await fetch(json.result)
let buffer = await audioRes.buffer()
await conn.sendMessage(m.chat, {
audio: buffer,
mimetype: "audio/mpeg",
ptt: true
}, { quoted: m })
} catch (e) {
console.error(e)
m.reply(`🍡 *Gagal membuat suara!*`)
} finally {
await global.loading(m, conn, true)
}
}

handler.help = ['tts']
handler.tags = ['tool']
handler.command = /^tts$/i
handler.limit = true
handler.register = true

export default handler