let handler = async (m, { conn, text, usedPrefix, command }) => {
if (!text) return m.reply(`🍜 *Masukkan kata kunci untuk mencari video XNXX!*\n\n🍱 *Contoh: ${usedPrefix + command} japanese* 🍣\n⚠️ *WARNING: This feature contains 18+ NSFW content.*\n📩 *Catatan: Video akan dikirim ke chat pribadi kamu demi keamanan.*`)
await global.loading(m, conn)
try {
let res = await fetch(global.API("btz", "/api/search/xnxx", { query: text }, "apikey"))
let json = await res.json()
if (!json.result || json.result.length === 0) return m.reply("🍟 *Tidak ada video ditemukan di XNXX!*")
let sections = [{
title: `🍤 Hasil Pencarian: ${text}`,
rows: json.result.slice(0, 10).map((v, i) => ({
title: v.title,
header: `🥟 Durasi: ${v.duration || '-'} • Views: ${v.views || '-'}`,
description: `🍘 Kualitas: ${v.quality?.trim() || '-'}\n🍱 Tap untuk download (${i + 1})`,
id: `.xnxxdl ${v.link}`
}))
}]
await conn.sendMessage(m.chat, {
image: { url: json.result[0].thumb },
caption: `🍙 *Ditemukan ${json.result.length} video XNXX untuk: ${text}*\n⚠️ *WARNING: This feature contains 18+ NSFW content.*\n📩 *Catatan: Video akan dikirim ke *chat pribadi* kamu demi keamanan.*`,
footer: "🍔 Gunakan dengan bijak!",
title: "🍕 XNXX Downloader",
interactiveButtons: [
{
name: "single_select",
buttonParamsJson: JSON.stringify({
title: "🍡 Pilih Video",
sections
})
}
]
}, { quoted: m })
} catch (e) {
console.error(e)
m.reply("🍧 *Terjadi kesalahan saat mengambil data dari XNXX!*")
} finally {
await global.loading(m, conn, true)
}
}

handler.help = ["xnxx"]
handler.tags = ["internet"]
handler.command = /^(xnxx)$/i
handler.premium = true

export default handler