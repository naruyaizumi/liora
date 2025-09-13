let handler = async (m, { conn, text, usedPrefix, command }) => {
if (!text) return conn.reply(m.chat, `🍿 *Masukkan kata kunci video TikTok!*\n\n*Contoh: ${usedPrefix + command} Tobrut*`, m)
await global.loading(m, conn)
try {
let res = await fetch(global.API("btz", "/api/search/tiktoks", { query: text }, "apikey"))
let json = await res.json()
let results = json.result?.data
if (!results || results.length === 0) throw '🍔 *Tidak ada hasil ditemukan di TikTok!*'
let cards = []
for (let i = 0; i < Math.min(10, results.length); i++) {
let item = results[i]
let toMinuteSecond = (sec) => {
let m = Math.floor(sec / 60)
let s = sec % 60
return `${m}m ${s}d`
}
let caption = `
🍛 *Nickname: ${item.author?.nickname}*
🍡 *Region: ${item.region}*
🍜 *Durasi: ${toMinuteSecond(item.duration)}*
🍘 *Ukuran: ${(item.size / 1024).toFixed(1)} KB*
━━━━━━━━━━━━━━━━━━━━
🥟 *Statistik Video:*
👀 *Views: ${item.play_count.toLocaleString()}*
❤️ *Likes: ${item.digg_count.toLocaleString()}*
💬 *Komentar: ${item.comment_count.toLocaleString()}*
📤 *Shares: ${item.share_count.toLocaleString()}*
📥 *Downloads: ${item.download_count.toLocaleString()}*
━━━━━━━━━━━━━━━━━━━━
🍱 *Tanggal Buat: ${new Date(item.create_time * 1000).toLocaleDateString("id-ID")}*
`.trim()
cards.push({
video: { url: item.play },
title: `🍙 *${i + 1}. ${item.title.trim()}*`,
body: caption,
footer: `🥠 Klik tombol untuk menonton langsung di TikTok`,
buttons: [
{
name: 'cta_url',
buttonParamsJson: JSON.stringify({
display_text: '🥤 Unduh di Browser',
url: item.play
})
},
{
name: 'cta_url',
buttonParamsJson: JSON.stringify({
display_text: '🎵 Ambil Audio',
url: item.music
})
}
]
})
}
await conn.sendMessage(m.chat, {
text: `🍢 *Hasil Pencarian TikTok: ${text}*`,
title: `🍙 *TikTok Search*`,
subtitle: '',
footer: `🍜 Pilih video untuk tonton langsung~`,
cards
}, { quoted: m })
} catch (e) {
console.error(e)
m.reply("🍵 *Terjadi kesalahan saat mengambil data dari TikTok.*")
} finally {
await global.loading(m, conn, true)
}
}

handler.help = ['ttsearch']
handler.tags = ['search']
handler.command = /^(ttsearch)$/i
handler.premium = true
handler.register = true

export default handler