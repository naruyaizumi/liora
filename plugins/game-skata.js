
import { sKata, cKata } from '../lib/sambung-kata.js'

const game = `
*❖ 𝐖𝐎𝐑𝐃 𝐂𝐇𝐀𝐈𝐍*
───────────────
*Permainan ini menguji ketangkasan dalam menyambung kata dari huruf terakhir kata sebelumnya. Fokus, cepat, dan jangan sampai kehabisan ide, ya!*`.trim()

const rules = `
*❖ 𝐆𝐀𝐌𝐄 𝐑𝐔𝐋𝐄𝐒*
───────────────
*• Gunakan kata dasar (tanpa imbuhan)*
*• Tidak boleh pakai spasi atau simbol*
*• Pemain terakhir akan jadi pemenang*
*• Hadiah: 500 XP × jumlah pemain*
*• Mulai game: .skata start*`.trim()
let handler = async (m, { conn, text, isPrems, isROwner, usedPrefix, command }) => {
let isDebug = /debug/i.test(command) && isROwner
conn.skata = conn.skata || {}
let id = m.chat
let kata = await genKata()
let room_all = Object.values(conn.skata).find(room => room.id !== id && room.player.includes(m.sender))
if (room_all) return m.reply(`Kamu sedang bermain sambung kata di chat lain, selesaikan game kamu terlebih dahulu`)
if (id in conn.skata) {
let room = conn.skata[id]
let member = room.player
if (room.status == 'play') {
if (!room.waktu._destroyed && !room.diam)
return conn.reply(m.chat, `🍰 *Hii @${m.sender.split`@`[0]}~*\n🍡 *Masih ada game yang belum selesai di sini nih!*\n🍬 *Tunggu sampai selesai dulu ya, baru bisa ikutan main lagi~*`, room.chat, { contextInfo: { mentionedJid: [m.sender]}})
delete conn.skata[id]
}
if (text == 'start' && room.status == 'wait') {
if (!member.includes(m.sender))
return m.reply(`🍩 *Kamu belum daftar nih~*\n🍓 *Ketik ${usedPrefix + command} buat ikutan yaa~*`)
if (member.length < 2)
return m.reply(`🍮 *Pemainnya masih kurang~*\n🍬 *Minimal 2 orang dulu biar bisa mulai, oke?*`)
room.curr = member[0]
room.status = 'play'
room.chat = await conn.reply(m.chat, `🍡 Saatnya @${member[0].split`@`[0]} yang main~!
🍰 *Mulai dari kata: ${(room.kata).toUpperCase()}*
🍬 *Lanjutkan: ${room.filter(room.kata).toUpperCase()}... ?*
🍭 *Reply untuk menjawab yaa~*
🍫 *Ketik "nyerah" kalau mau menyerah~*
🍩 *Total Pemain: ${member.length} orang*`, m, {
contextInfo: { mentionedJid: member }
})
room.win_point = 100
for (let i of room.player) {
let user = global.db.data.users[i]
if (!('skata' in user)) user.skata = 0
}
clearTimeout(room.waktu_list)
room.waktu = setTimeout(() => {
conn.reply(m.chat, `⏰ *Waktu habis~!*\n🍬 *@${room.curr.split`@`[0]} tereliminasi dari game~*`, room.chat, {
contextInfo: { mentionedJid: member }
}).then(_ => {
room.eliminated.push(room.curr)
let index = member.indexOf(room.curr)
member.splice(index, 1)
room.curr = member[0]
if (room.player.length == 1 && room.status == 'play') {
global.db.data.users[member[0]].exp += room.win_point
conn.reply(m.chat, `🍓 *Yatta~! @${member[0].split`@`[0]} menang permainan~!!*\n🍰 *Hadiah: +${room.win_point} XP~*`, room.chat, {
contextInfo: { mentionedJid: member }
}).then(_ => {
delete conn.skata[id]
return !0
})
}
room.diam = true
room.new = true
let who = room.curr
conn.preSudo('nextkata', who, m).then(async _ => {
conn.ev.emit('messages.upsert', _)
})
})
}, 45000)
} else if (room.status == 'wait') {
if (member.includes(m.sender)) return m.reply(`🍬 *Kamu udah masuk list, sayang~*`)
member.push(m.sender)
clearTimeout(room.waktu_list)
room.waktu_list = setTimeout(() => {
conn.reply(m.chat, `🍡 *Waktu habis! Game sambung kata dibatalkan ya~*`, room.chat).then(() => { delete conn.skata[id] })
}, 120000)
let caption = `
🍰 *Daftar Pemain Sambung Kata*
━━━━━━━━━━━━━━━━━━━━
${member.map((v, i) => `🍩 *${i + 1}. @${v.split`@`[0]}*`).join('\n')}
━━━━━━━━━━━━━━━━━━━━
🍓 *Catatan:*
*Permainan akan berjalan secara bergiliran, dan hanya bisa diikuti oleh pemain yang sudah mendaftar ya~!*
`.trim()
room.chat = await conn.reply(m.chat, `${caption}\n\n🍬 *Ketik: *${usedPrefix + command} untuk ikut main*\n*${usedPrefix + command} start untuk mulai game*`, m, { contextInfo: { mentionedJid: conn.parseMention(caption) } })
}
} else {
conn.skata[id] = {
id,
player: isDebug ? ([owner[0] + '@s.whatsapp.net', conn.user.jid, owner[0] + '@s.whatsapp.net']) : [],
status: 'wait',
eliminated: [],
basi: [],
diam: false,
win_point: 0,
curr: '',
kata,
filter,
genKata,
chat: conn.reply(m.chat, `${game}\n${rules}`, m),
waktu: false
}
}
}

handler.help = ['sambungkata']
handler.tags = ['game']
handler.command = /^s(ambung)?kata(debug)?$/i
handler.group = true
handler.game = true
handler.register = true

export default handler

async function genKata() {
let json = await sKata()
let result = json.kata
while (result.length < 3 || result.length > 7) {
json = await sKata()
result = json.kata
}
return result
}

function filter(text) {
let mati = ["q","w","r","t","y","p","s","d","f","g","h","j","k","l","z","x","c","v","b","n","m"]
let misah
if (text.length < 3) return text
if (/([qwrtypsdfghjklzxcvbnm][qwrtypsdfhjklzxcvbnm])$/.test(text)) {
let mid = /([qwrtypsdfhjklzxcvbnm])$/.exec(text)[0]
return mid
}
if (/([qwrtypsdfghjklzxcvbnm][aiueo]ng)$/.test(text)) {
let mid = /([qwrtypsdfghjklzxcvbnm][aiueo]ng)$/.exec(text)[0]
return mid
} else if (/([aiueo][aiueo]([qwrtypsdfghjklzxcvbnm]|ng)?)$/i.test(text)) {
if (/(ng)$/i.test(text)) return text.substring(text.length - 3)
else if (/([qwrtypsdfghjklzxcvbnm])$/i.test(text)) return text.substring(text.length - 2)
else return text.substring(text.length - 1)
} else if (/n[gy]([aiueo]([qwrtypsdfghjklzxcvbnm])?)$/.test(text)) {
let nyenye = /n[gy]/i.exec(text)[0]
misah = text.split(nyenye)
return nyenye + misah[misah.length - 1]
} else {
let res = Array.from(text).filter(v => mati.includes(v))
let resu = res[res.length - 1]
for (let huruf of mati) {
if (text.endsWith(huruf)) {
resu = res[res.length - 2]
}
}
misah = text.split(resu)
if (text.endsWith(resu)) {
return resu + misah[misah.length - 2] + resu
}
return resu + misah[misah.length - 1]
}
}