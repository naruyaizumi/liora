
let handler = async (m, { conn }) => {
let blacklist = global.db.data.bot?.stickerBlacklist || {}
let hashes = Object.entries(blacklist)
if (!hashes.length) return m.reply('🍩 *Belum ada stiker yang diblacklist, aman sentosa~*')
let list = hashes.map(([hash, info], i) => {
let waktu = new Date(info.date).toLocaleString('id-ID')
return `${i + 1}. 🍰 *Hash: ${hash}*\n    🍡 *Diblokir oleh:* @${info.addedBy.split('@')[0]}\n    🍬 *Alasan: ${info.reason}*\n    ⏰ *Tanggal: ${waktu}*`
}).join('\n\n')
await conn.reply(m.chat, `🎀 *DAFTAR STIKER TERBLACKLIST* 🍫\n\n${list}`, m, {
mentions: hashes.map(([_, info]) => info.addedBy)
})
}

handler.help = ['listblstc']
handler.tags = ['database']
handler.command = /^(listblstc)$/i
handler.admin = true
handler.register = true

export default handler