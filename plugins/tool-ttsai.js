let voices = [
"alloy", "ash", "ballad", "coral", "echo", "fable",
"onyx", "nova", "sage", "shimmer", "verse"
]
let ttsQueue = {}
let handler = async (m, { conn, args, usedPrefix, command }) => {
if (!args[0]) return m.reply(`🔊 *Masukkan teks untuk diubah ke suara!*\n\nContoh:\n${usedPrefix + command} Halo dunia`)
let text = args.join(" ")
ttsQueue[m.sender] = text
let list = voices.map((v, i) => [v, (i + 1).toString(), v])
await conn.textList(m.chat, `🎧 *Pilih Voice Model TTS AI*\n📝 *Teks: "${text}"*`, false, list, m)
}
handler.before = async (m, { conn }) => {
let userId = m.sender
if (!ttsQueue[userId]) return
let voice = m.text.trim().toLowerCase()
if (!voices.includes(voice)) return
let text = ttsQueue[userId]
delete ttsQueue[userId]
await global.loading(m, conn)
try {
let apiUrl = `https://api.hiuraa.my.id/tools/openai-tts?text=${text}&voice=${voice}`
let res = await fetch(apiUrl)
if (!res.ok) throw new Error(await res.text())
let buffer = Buffer.from(Buffer.from(await res.arrayBuffer()))
if (!buffer || buffer.length === 0) throw new Error("Buffer audio kosong!")
await conn.sendMessage(m.chat, {
audio: buffer,
mimetype: "audio/mpeg",
ptt: true
}, { quoted: m })
} catch (e) {
console.error(e)
m.reply(`❌ *Gagal membuat suara!*\n⚠️ *Detail:* ${e.message}`)
} finally {
await global.loading(m, conn, true)
}
}

handler.help = ['ttsai']
handler.tags = ['tools']
handler.command = /^(ttsai)$/i
handler.limit = true
handler.register = true

export default handler