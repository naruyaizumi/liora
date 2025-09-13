let handler = async (m, { conn }) => {
let logs = global.db.data.bots.logs
logs.history = logs.history ? logs.history : []
let header = '🗂️ *HISTORY LOGS UPDATE*\n\n'
if (logs.history.length < 1) return m.reply('❌ *Belum ada logs!*')

let caption = logs.history.reverse().map((v, i) => {
return `✨ *${i + 1}. Tanggal: ${v.date}*
📌 *Fitur: ${v.fitur}*
📝 *Deskripsi:* ${v.update}

💡 *Update Fitur ${v.fitur}*`
}).join('\n\n')
await conn.sendMessage(m.chat, {
text: `${header}${caption}\n\n🩵 *LOGS UPDATE TERBARU*\n🎀 *Setiap update selalu masuk sini yaa, sayang!*`
}, { quoted: m })
}

handler.help = ['logs']
handler.tags = ['info']
handler.command = /^(log(s)?)$/i
handler.group = true
handler.register = true

export default handler