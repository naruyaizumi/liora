
let handler = async (m, { conn, args, usedPrefix, command }) => {
try {
await global.loading(m, conn)
let email = args[0]
if (!email) return m.reply(`⚠️ *Masukkan alamat email.*\n*Contoh: ${usedPrefix + command} naruya123@getmule.com*`)
let apiUrl = global.API('btz', '/api/tools/cek-msg-tmp-mail', { email }, 'apikey')
let res = await fetch(apiUrl)
let json = await res.json()
if (!json.status || !Array.isArray(json.result)) {
return m.reply('❌ Gagal mengecek email atau format tidak valid.')
}
let result = json.result
if (result.length === 0) {
return m.reply(`📭 *Tidak ada pesan masuk untuk email: ${email}*`)
}
let out = `📨 *Inbox: ${email}*\n━━━━━━━━━━━━━━━━━━━`
for (let i = 0; i < result.length; i++) {
let mail = result[i]
out += `\n\n✉️ *Pesan ${i + 1}*
📌 *Subjek: ${mail.subject}*
🧾 *Dari: ${mail.from}*
📅 *Tanggal: ${mail.date}*
📖 *Isi:*
${mail.body}`
}
m.reply(out.trim())
} catch (e) {
console.error(e)
m.reply('⚠️ Terjadi kesalahan saat memproses email.')
} finally {
await global.loading(m, conn, true)
}
}

handler.help = ['cektmpmail']
handler.tags = ['tools']
handler.command = /^(cektmpmail)$/i
handler.limit = true
handler.register = true

export default handler