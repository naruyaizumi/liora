let handler = m => m

handler.before = async function (m) {
try {
if (!this.suit) this.suit = {}
if (m.isBaileys || m.fromMe) return
let user = global.db.data.users
if (user[m.sender].suit < 0) user[m.sender].suit = 0
let room = Object.values(this.suit).find(room => room.id && room.status && [room.p, room.p2].includes(m.sender))
if (room) {
let win = ''
let tie = false
if (m.isGroup) {
const groupMeta = (this.chats[m.chat] || {}).metadata || await this.groupMetadata(m.chat).catch(_ => null)
if (groupMeta) {
const fixP = groupMeta.participants.find(u => u.lid === room.p)
if (fixP) room.p = fixP.id
const fixP2 = groupMeta.participants.find(u => u.lid === room.p2)
if (fixP2) room.p2 = fixP2.id
}
}
if (
m.sender == room.p2 &&
/^(acc(ept)?|terima|gas|oke?|tolak|gamau|nanti|ga(k.)?bisa)/i.test(m.text) &&
m.isGroup &&
room.status == 'wait'
) {
if (/^(tolak|gamau|nanti|ga(k.)?bisa)/i.test(m.text)) {
await this.reply(m.chat, `@${room.p2.split`@`[0]} *menolak suit, suit dibatalkan* 🍩`, m, { mentions: [room.p2] })
delete this.suit[room.id]
return !0
}
room.status = 'play'
room.asal = m.chat
clearTimeout(room.waktu)
await this.reply(m.chat, `🍓 *Suit dimulai!* 🍓\n@${room.p.split`@`[0]} *dan* @${room.p2.split`@`[0]} *silakan pilih di chat masing-masing* 🍰`, m, { mentions: [room.p, room.p2] })
await this.reply(room.p, `*Pilih batu/gunting/kertas* 🎀\n*Menang +${room.poin}XP*\n*Kalah -${room.poin_lose}XP*`, null)
await delay(1500)
await this.reply(room.p2, `*Pilih batu/gunting/kertas* 🎀\n*Menang +${room.poin}XP*\n*Kalah -${room.poin_lose}XP*`, null)
room.waktu_milih = setTimeout(() => {
if (!room.pilih && !room.pilih2) {
this.reply(m.chat, `*Kedua pemain tidak memilih, suit dibatalkan* 🍭`, m)
} else if (!room.pilih || !room.pilih2) {
win = !room.pilih ? room.p2 : room.p
user[win].exp += room.poin
user[win == room.p ? room.p2 : room.p].exp -= room.poin_lose
this.reply(m.chat, `@${(room.pilih ? room.p2 : room.p).split`@`[0]} *tidak memilih, game berakhir* 🍭`, m, { mentions: [(room.pilih ? room.p2 : room.p)] })
}
delete this.suit[room.id]
}, room.timeout)
}
let jwb = m.sender == room.p
let jwb2 = m.sender == room.p2
let g = /gunting/i
let b = /batu/i
let k = /kertas/i
let reg = /^(gunting|batu|kertas)/i
if (jwb && reg.test(m.text) && !room.pilih && !m.isGroup) {
room.pilih = reg.exec(m.text.toLowerCase())[0]
room.text = m.text
await this.reply(m.chat, `*Kamu telah memilih ${m.text}* ${!room.pilih2 ? `\n\n> Menunggu lawan memilih 🍓` : ''}`, m)
if (!room.pilih2) await this.reply(room.p2, `*Lawan sudah memilih! Sekarang giliranmu* 🍰`, null)
}
if (jwb2 && reg.test(m.text) && !room.pilih2 && !m.isGroup) {
room.pilih2 = reg.exec(m.text.toLowerCase())[0]
room.text2 = m.text
await this.reply(m.chat, `*Kamu telah memilih ${m.text}* ${!room.pilih ? `\n\n*Menunggu lawan memilih* 🍓` : ''}`, m)
if (!room.pilih) await this.reply(room.p, `*Lawan sudah memilih! Sekarang giliranmu* 🍰`, null)
}
let stage = room.pilih
let stage2 = room.pilih2
if (room.pilih && room.pilih2) {
clearTimeout(room.waktu_milih)
if (b.test(stage) && g.test(stage2)) win = room.p
else if (b.test(stage) && k.test(stage2)) win = room.p2
else if (g.test(stage) && k.test(stage2)) win = room.p
else if (g.test(stage) && b.test(stage2)) win = room.p2
else if (k.test(stage) && b.test(stage2)) win = room.p
else if (k.test(stage) && g.test(stage2)) win = room.p2
else if (stage == stage2) tie = true
await this.reply(
room.asal,
`*Hasil Suit* ${tie ? '\n*SERI!* 🍭' : ''}
@${room.p.split`@`[0]} *(${room.text}) ${tie ? '' : room.p == win ? `Menang +${room.poin}XP 🍬` : `Kalah -${room.poin_lose}XP 🍬`}*
@${room.p2.split`@`[0]} *(${room.text2}) ${tie ? '' : room.p2 == win ? `Menang +${room.poin}XP 🍬` : `Kalah -${room.poin_lose}XP 🍬`}*`
.trim(),
null,
{ mentions: [room.p, room.p2] }
)

if (!tie) {
user[win].exp += room.poin
user[win == room.p ? room.p2 : room.p].exp -= room.poin_lose
}
delete this.suit[room.id]
}
return !0
}
} catch (e) {
console.error(e)
}
}

handler.exp = 0
export default handler

let delay = time => new Promise(res => setTimeout(res, time))
function random(arr) {
return arr[Math.floor(Math.random() * arr.length)]
}