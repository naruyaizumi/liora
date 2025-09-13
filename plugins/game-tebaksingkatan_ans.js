
import similarity from 'similarity'
const threshold = 0.72

export async function before(m) {
let id = m.chat
if (m.isBaileys || m.fromMe || !m.text) return
this.tebaksingkatan = this.tebaksingkatan || {}
let setting = global.db.data.settings[conn.user.jid]
if (setting.composing) await this.sendPresenceUpdate('composing', m.chat)
if (setting.autoread) await this.readMessages([m.key])
if (!(id in this.tebaksingkatan)) return
let data = this.tebaksingkatan[id]
if (!m.quoted || m.quoted.id !== data[0]?.key?.id) return
let isSurrender = /^((me)?nyerah|surr?ender)$/i.test(m.text)
if (isSurrender) {
clearTimeout(data[2])
delete this.tebaksingkatan[id]
return m.reply(`🏳 *Kamu menyerah!*\n\n📛 *Singkatan: ${data[1].original.short}*\n📖 *Kepanjangan: ${data[1].original.full}*`)
}
let jawaban = data[1].answer.toLowerCase().trim()
let userJawab = m.text.toLowerCase().trim()
if (userJawab === jawaban || similarity(userJawab, jawaban) >= threshold) {
clearTimeout(data[2])
global.db.data.users[m.sender].exp += data[3]
delete this.tebaksingkatan[id]
return m.reply(`🎉 *BENAR! (${Math.round(similarity(userJawab, jawaban) * 100)}% cocok)*\n\n📛 *Singkatan: ${data[1].original.short}*\n📖 *Kepanjangan: ${data[1].original.full}*\n📈 *+${data[3]} XP*`)
}
data[4]--
if (data[4] <= 0) {
clearTimeout(data[2])
delete this.tebaksingkatan[id]
return m.reply(`❌ *Kesempatan habis!*\n\n📛 *Singkatan:* ${data[1].original.short}\n📖 *Kepanjangan:* ${data[1].original.full}`)
}
return m.reply(`🔁 *Salah sayang~*\n📉 *Sisa kesempatan:* ${data[4]}`)
}

export const exp = 0