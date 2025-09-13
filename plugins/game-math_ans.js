
export async function before(m) {
if (!/^-?[0-9]+(\.[0-9]+)?$/.test(m.text)) return !0
let id = m.chat
if (m.isBaileys || m.fromMe) return
if (!m.quoted || !m.quoted.fromMe || !m.text || !/^🧠 \*Soal Matematika/i.test(m.quoted.text)) return !0
this.math = this.math || {}
if (!(id in this.math)) return m.reply('⚠️ *Soal itu sudah berakhir!*')

let setting = global.db.data.settings[conn.user.jid]
if (setting.composing) await this.sendPresenceUpdate('composing', m.chat)
if (setting.autoread) await this.readMessages([m.key])

if (m.quoted.id === this.math[id][0].id) {
let soal = this.math[id][1]
let jawaban = Number(soal.result.toFixed(4))
let userJawab = Number(m.text)

if (userJawab === jawaban) {
global.db.data.users[m.sender].exp += soal.bonus
clearTimeout(this.math[id][3])
delete this.math[id]
return m.reply(`✅ *Jawaban benar!*\n🎁 *+${soal.bonus} XP*`)
} else {
if (--this.math[id][2] === 0) {
clearTimeout(this.math[id][3])
delete this.math[id]
return m.reply(`⛔ *Kesempatan habis!*\n📌 *Jawaban: ${jawaban}*`)
} else {
return m.reply(`❌ *Jawaban salah!*\n💡 *Kesempatan tersisa: ${this.math[id][2]}*`)
}
}
}
return !0
}