let handler = async (m, { conn, args, usedPrefix, command }) => {
if (!args[0]) throw `🔗 *Masukkan URL yang ingin dipersingkat!*\n📌 *Contoh: ${usedPrefix + command} https://google.com*`
let url = args[0]
try {
await global.loading(m, conn)
let res1 = await fetch(global.API("lol", "/api/shortlink", { url }))
let json1 = await res1.json()
if (json1.status !== 200) throw "❌ Gagal mempersingkat dengan API pertama!"
let res2 = await fetch(global.API("lol", "/api/shortlink3", { url }))
let json2 = await res2.json()
if (json2.status !== 200) throw "❌ Gagal mempersingkat dengan API kedua!"
await conn.sendMessage(m.chat, {
text: `
*🎯 Short Link Generator*
🔗 *Original: ${url}*
━━━━━━━━━━━━━━━━━━━
✨ *Hasil Shortlink:*
*1. ${json1.result}*
*2. ${json2.result}*
━━━━━━━━━━━━━━━━━━━
`
}, { quoted: m })
} catch (e) {
console.error(e)
m.reply(`❌ *Terjadi Kesalahan!*\n⚠️ *Detail:* ${e.message}`)
} finally {
await global.loading(m, conn, true)
}
}

handler.help = ["shortlink"]
handler.tags = ["tools"]
handler.command = /^(short(url|link)?)$/i
handler.limit = true
handler.register = true

export default handler