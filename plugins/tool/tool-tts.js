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

let handler = async (m, { conn, args, usedPrefix, command }) => {
if (!args[0]) return m.reply(`🍬 *Masukkan teks untuk diubah jadi suara!*\n\n🍭 *Contoh: ${usedPrefix + command} Halo Izumi*`)
const input = args.join(" ")
if (input.includes("|")) {
const [rawCode, ...rest] = input.split("|")
const langCode = rawCode.trim()
const text = rest.join("|").trim()
const selected = languages.find(([code]) => code === langCode)
if (!selected) return m.reply("🍡 *Bahasa tidak valid!*")
if (!text) return m.reply("🍥 *Teksnya mana?*")
await global.loading(m, conn)
try {
const apiUrl = global.API("btz", "/api/sound/texttosound", { text1: text, lang: langCode }, "apikey")
const res = await fetch(apiUrl, { headers: { "accept": "application/json" } })
if (!res.ok) throw new Error("HTTP " + res.status)
const json = await res.json()
const fileUrl = json.result || json.url
if (!fileUrl) throw new Error("No result URL from API")
await conn.sendFile(m.chat, fileUrl, 'audio.mp3', '', m, true, {
mimetype: 'audio/mpeg',
ptt: true
})
} catch (e) {
console.error(e)
m.reply("🍥 *Error saat membuat suara!*")
} finally {
await global.loading(m, conn, true)
}
return
}
const sections = [
{
title: "🍙 Pilih Bahasa",
rows: languages.map(([code, name]) => ({
header: name,
title: code,
description: `Gunakan ${name} untuk TTS`,
id: `${usedPrefix + command} ${code}|${input}`
}))
}
]
await conn.sendMessage(m.chat, {
image: { url: "https://files.cloudkuimages.guru/images/uArC8eFJ.jpg" },
caption: `🍓 *Text-to-Speech*\n🧁 *Teks: "${input}"*\n🍱 *Silakan pilih bahasa di bawah~*`,
footer: "🍛 TTS Generator",
title: "🍡 Pilih Bahasa",
interactiveButtons: [
{
name: "single_select",
buttonParamsJson: JSON.stringify({
title: "🍙 Bahasa TTS",
sections
})
}
]
}, { quoted: m })
}

handler.help = ['tts']
handler.tags = ['tools']
handler.command = /^(tts)$/i

export default handler