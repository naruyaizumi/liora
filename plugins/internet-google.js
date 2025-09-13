let handler = async (m, { conn, usedPrefix, command, text }) => {
if (!text) return conn.reply(m.chat, `🍩 *Masukkan kata kunci pencarian!*\n\n*Contoh: ${usedPrefix + command} siapa presiden RI 2025*`, m)
await global.loading(m, conn)
try {
let res = await fetch(`https://api.hiuraa.my.id/search/google?q=${text}`)
let json = await res.json()
if (!json.status || !Array.isArray(json.result)) throw '❌ *Tidak ada hasil ditemukan!*'
let hasil = `🍓 *Hasil Pencarian Google:*

*1. ${json.result[0].title}*
*${json.result[0].desc}*
*${json.result[0].link}*

━━━━━━━━━━━━━━━━━━━━
🔎 *Berikut hasil lainnya:*`
for (let i = 1; i < json.result.length; i++) {
hasil += `
*${i + 1}. ${json.result[i].title}*
${json.result[i].link}`
}
await conn.sendMessage(m.chat, {
text: hasil
}, { quoted: m })
} catch (e) {
console.error(e)
m.reply('❌ *Gagal mengambil hasil pencarian.*')
} finally {
await global.loading(m, conn, true)
}
}

handler.help = ['google']
handler.tags = ['internet']
handler.command = /^(google)$/i
handler.limit = true
handler.register = true

export default handler