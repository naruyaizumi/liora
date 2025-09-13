
import similarity from 'similarity'
const threshold = 0.72

export async function before(m) {
let id = m.chat
if (m.isBaileys || m.fromMe) return
if (!m.quoted || !m.quoted.fromMe || !m.text || !/Ketik.*hkan|ᴋᴇᴛɪᴋ.*ʜᴋᴀɴ/i.test(m.quoted.text) || /.*hkan|.*ʜᴋᴀɴ/i.test(m.text)) return !0
this.tebaktebakan = this.tebaktebakan || {}
let setting = global.db.data.settings[conn.user.jid]
if (setting.composing) await this.sendPresenceUpdate('composing', m.chat)
if (setting.autoread) await this.readMessages([m.key])
if (!(id in this.tebaktebakan)) return m.reply('⛔ *Soal itu telah berakhir!*')
if (m.quoted.id === this.tebaktebakan[id][0].id) {
let isSurrender = /^((me)?nyerah|surr?ender)$/i.test(m.text)
if (isSurrender) {
clearTimeout(this.tebaktebakan[id][4])
delete this.tebaktebakan[id]
return m.reply('🏳️ *Yah, nyerah? Semangat lagi nanti yaa* 🩷')
}
let json = JSON.parse(JSON.stringify(this.tebaktebakan[id][1]))
let jawaban = json.jawaban.toLowerCase().trim()
let userJawab = m.text.toLowerCase().trim()
if (userJawab === jawaban) {
global.db.data.users[m.sender].exp += this.tebaktebakan[id][2]
m.reply(`🎉 *Benar!*\n📈 *+${this.tebaktebakan[id][2]} XP*`)
clearTimeout(this.tebaktebakan[id][4])
delete this.tebaktebakan[id]
} else if (similarity(userJawab, jawaban) >= threshold) {
m.reply('🟨 *Dikit lagi sayang! Coba perhatikan hurufnya* 😚')
} else if (--this.tebaktebakan[id][3] === 0) {
clearTimeout(this.tebaktebakan[id][4])
delete this.tebaktebakan[id]
conn.reply(m.chat, `❌ *Kesempatan habis!* 😭\n📖 *Jawaban: ${json.jawaban}*`, m)
} else {
m.reply(`🔁 *Salah sayang~*\n📉 *Sisa kesempatan: ${this.tebaktebakan[id][3]}*`)
}
}
return !0
}

export const exp = 0