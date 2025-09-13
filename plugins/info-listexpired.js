
let handler = async (m, { conn }) => {
let chats = global.db.data.chats
let list = []
let now = new Date() * 1
for (let id in chats) {
if (!id.endsWith('@g.us')) continue
let chat = chats[id]
if (!chat.expired) continue
let sisa = chat.expired - now
if (sisa <= 0) continue
try {
let metadata = await conn.groupMetadata(id)
let name = metadata.subject
let size = metadata.participants.length
let code = await conn.groupInviteCode(id)
let link = `https://chat.whatsapp.com/${code}`
let days = Math.floor(sisa / (24 * 60 * 60 * 1000))
let hours = Math.floor((sisa % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000))
let minutes = Math.floor((sisa % (60 * 60 * 1000)) / (60 * 1000))
list.push(
`🍮 *Nama Grup: ${name}*
🍭 *ID: ${id}*
🍡 *Member: ${size}*
📎 *Link: ${link}*
🍧 *Sisa waktu: ${days} hari ${hours} jam ${minutes} menit*`
)
} catch (e) {
list.push(`🍪 *${id} ❌ (Gagal ambil metadata/link)*`)
}
}
if (list.length === 0) return m.reply('🍩 *Tidak ada grup yang sedang dalam masa sewa.*')
conn.reply(m.chat, `🎂 *Daftar Grup dengan Masa Sewa Aktif:*\n\n${list.join('\n\n')}`, m)
}

handler.help = ['listexpired']
handler.tags = ['owner']
handler.command = /^(list(sewa|expired))$/i
handler.owner = true

export default handler