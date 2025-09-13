
import fs from 'fs'
export async function before(m) {
let id = m.chat
let reward = 2500
if (m.isBaileys || m.fromMe) return
let body = typeof m.text == 'string' ? m.text : false
this.tebakbom = this.tebakbom ? this.tebakbom : {}
if (!(id in this.tebakbom) && m.quoted && /❏  *B O M B*|❏  *ʙ ᴏ ᴍ ʙ*/i.test(m.quoted.text)) return this.reply(m.chat, `🍡 *Sesi telah berakhir, kirim .tebakbom untuk memulai game baru~*`, m)
if ((id in this.tebakbom) && !isNaN(body)) {
let timeout = 180000
let json = this.tebakbom[id][1].find(v => v.position == body)
let setting = global.db.data.settings[conn.user.jid]
if (setting.composing) await this.sendPresenceUpdate('composing', m.chat)
if (setting.autoread) await this.readMessages([m.key])
if (!json) return this.reply(m.chat, `🧁 *Ketik angka 1 - 9 untuk membuka salah satu kotak yaa~*`, m)
if (json.emot == '💣') {
json.state = true
let bomb = this.tebakbom[id][1]
let teks = `❏  *B O M B*\n\n`
teks += `💥 *Duuarrr!! Kamu kena bom sayang...*\n\n`
teks += bomb.slice(0, 3).map(v => v.state ? v.emot : v.number).join('') + '\n'
teks += bomb.slice(3, 6).map(v => v.state ? v.emot : v.number).join('') + '\n'
teks += bomb.slice(6).map(v => v.state ? v.emot : v.number).join('') + '\n\n'
teks += `⏱️ *Timeout : [ ${((timeout / 1000) / 60)} menit ]*\n`
teks += `🍬 *Permainan selesai! Kotak berisi bom berhasil dibuka.*`
this.sendFile(m.chat, "https://telegra.ph/file/287cbe90fe5263682121d.jpg", "", teks, m)
clearTimeout(this.tebakbom[id][2])
delete this.tebakbom[id]
} else if (json.state) {
return this.reply(m.chat, `🍬 *Kotak ${json.number} sudah dibuka, pilih kotak yang lain yaa~*`, m)
} else {
json.state = true
let changes = this.tebakbom[id][1]
let open = changes.filter(v => v.state && v.emot != '💣').length
if (open >= 8) {
let teks = `❏  *B O M B*\n\n`
teks += `🍭 *Yeay! Kamu berhasil membuka semua kotak kecuali bom!*\n\n`
teks += changes.slice(0, 3).map(v => v.state ? v.emot : v.number).join('') + '\n'
teks += changes.slice(3, 6).map(v => v.state ? v.emot : v.number).join('') + '\n'
teks += changes.slice(6).map(v => v.state ? v.emot : v.number).join('') + '\n\n'
teks += `⏱️ Timeout : [ *${((timeout / 1000) / 60)} menit* ]\n`
teks += `🎁 *Permainan selesai! Kamu dapat: + ${reward} Exp*`
this.sendFile(m.chat, "https://telegra.ph/file/f6ebfea2758b947e1e49d.jpg", "", teks, m)
global.db.data.users[m.sender].exp += reward
clearTimeout(this.tebakbom[id][2])
delete this.tebakbom[id]
} else {
let teks = `❏  *B O M B*\n\n`
teks += `🍡 *Ayo pilih kotak lagi, jangan sampai kena bom yaa~*\n\n`
teks += changes.slice(0, 3).map(v => v.state ? v.emot : v.number).join('') + '\n'
teks += changes.slice(3, 6).map(v => v.state ? v.emot : v.number).join('') + '\n'
teks += changes.slice(6).map(v => v.state ? v.emot : v.number).join('') + '\n\n'
teks += `⏱️ *Timeout : [ ${((timeout / 1000) / 60)} menit ]*\n`
teks += `✨ *Kotak berisi bom belum terbuka.*`
this.reply(m.chat, teks, m).then(() => {
global.db.data.users[m.sender].exp += reward
})
}
}
}
}

async function randomInt(min, max) {
min = Math.ceil(min)
max = Math.floor(max)
return Math.floor(Math.random() * (max - min + 1)) + min
}