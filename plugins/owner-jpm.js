let handler = async (m, { conn }) => {
let allGroups = Object.entries(conn.chats).filter(([jid, chat]) => jid.endsWith('@g.us'))
let totalGroups = allGroups.length
let groups = []
let blacklisted = 0
for (let [jid, chat] of allGroups) {
let isBlocked = !chat.isChats || chat.metadata?.read_only || chat.metadata?.announce || global.db.data.chats[jid]?.blpromosi
if (isBlocked) {
blacklisted++
continue
}
groups.push(jid)
}
if (!groups.length) return m.reply('🍱 *Semua grup dalam blacklist atau tidak bisa dikirimi pesan.*')
await m.reply(`🍘 *Total grup terdeteksi: ${totalGroups}*
🥢 *Grup diblacklist: ${blacklisted}*
🍜 *Grup aktif yang akan dikirimi: ${groups.length}*`)
let success = 0
let failed = 0
for (let jid of groups) {
try {
let store = global.db.data.chats[jid]?.store || {}
let items = Object.values(store).filter(item =>
item.id && item.nama && item.harga && item.nomor && item.deskripsi && item.media
)
if (!items.length) continue
let cards = items.map(item => ({
image: { url: item.media },
title: `🍘 ${item.nama}`,
body: `🍱 Rp${Number(item.harga).toLocaleString('id-ID')}\n🍡 ${item.deskripsi}`,
footer: `📞 Klik tombol untuk langsung chat`,
buttons: [
{
name: 'cta_url',
buttonParamsJson: JSON.stringify({
display_text: '🍜 Chat Penjual',
url: `https://wa.me/${item.nomor}`,
merchant_url: `https://wa.me/${item.nomor}`
})
}
]
}))
await conn.sendMessage(jid, {
text: `🥟 *Daftar Item di Store Grup Ini*`,
title: '🧺 *Etalase Store Grup Ini*',
subtitle: '',
footer: 'Klik tombolnya untuk langsung transaksi yaa~ 🍧',
cards,
mentions: participants
})
success++
await delay()
} catch (err) {
console.error(`[ERROR JPM ${jid}]:`, err)
failed++
}
}
await m.reply(`🎐 *JPM selesai dikirim ke semua grup!*
🍢 *Berhasil: ${success}*
🍡 *Gagal: ${failed}*
📦 *Total grup aktif: ${groups.length}*`)
}

handler.help = ['jpm']
handler.tags = ['owner']
handler.command = /^(jpm)$/i
handler.owner = true

export default handler

function delay() {
return new Promise(resolve => setTimeout(resolve, 5500))
}