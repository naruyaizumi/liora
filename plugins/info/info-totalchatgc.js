let handler = async (m, { conn }) => {
let user = global.db.data.chats[m.chat].member
let member = Object.keys(user)
.filter(v => v != conn.user.jid)
.sort((a, b) => {
const totalA = user[a].chat
const totalB = user[b].chat
return totalB - totalA
})
let nomor = 1
let chatToday = 0
let chatTotal = 0
for (let number of member) {
chatToday += user[number].chat
chatTotal += user[number].chatTotal
}
let head = `🍙 *Statistik Obrolan Grup* 🍙\n🍜 *Total Hari Ini: ${toRupiah(chatToday)} chat*\n🍤 *Total Keseluruhan: ${toRupiah(chatTotal)} chat*\n━━━━━━━━━━━━━━\n\n`
let caption = ''
for (let i = 0; i < Math.min(10, member.length); i++) {
if (typeof user[member[i]] != 'undefined') {
caption += `🍡 *${nomor++}. ${await conn.getName(member[i])}*\n`
caption += `🍱 *Chat Hari Ini: ${toRupiah(user[member[i]].chat)}*\n`
caption += `🍰 *Total Chat: ${toRupiah(user[member[i]].chatTotal)}*\n`
caption += `🍩 *Terakhir Aktif: ${getTime(user[member[i]].lastseen)}*\n\n`
}
}
await m.reply(head + caption.trim())
}

handler.help = ['totalchatgc']
handler.tags = ['info']
handler.command = /^(totalchatgc)$/i
handler.group = true
handler.admin = true

export default handler

export function parseMs(ms) {
if (typeof ms !== 'number') throw 'Parameter harus berupa angka'
return {
days: Math.trunc(ms / 86400000),
hours: Math.trunc(ms / 3600000) % 24,
minutes: Math.trunc(ms / 60000) % 60,
seconds: Math.trunc(ms / 1000) % 60
}
}

export function getTime(ms) {
let now = parseMs(+new Date() - ms)
if (now.days) return `${now.days} hari lalu 🍙`
else if (now.hours) return `${now.hours} jam lalu 🍜`
else if (now.minutes) return `${now.minutes} menit lalu 🍤`
else return `beberapa detik lalu 🍡`
}

const toRupiah = number => parseInt(number).toLocaleString("id-ID").replace(/,/gi, ".")