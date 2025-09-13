
import similarity from 'similarity'

const threshold = 0.85
export async function before(m) {
this.family2 = this.family2 || {}
let id = m.chat
if (m.isBaileys || m.fromMe) return
if (!(id in this.family2)) return !0

let room = this.family2[id]
let text = m.text.toLowerCase().replace(/[^\w\s\-]+/g, '')
let isSurrender = /^((me)?nyerah|surr?ender)$/i.test(m.text)

if (!isSurrender) {
let index = room.jawaban.indexOf(text)
if (index < 0) {
if (
Math.max(...room.jawaban
.filter((_, idx) => !room.terjawab[idx])
.map(j => similarity(j, text))
) >= threshold
) {
m.reply('🤏 *Dikit lagi!*')
}
return !0
}
if (room.terjawab[index]) return !0
global.db.data.users[m.sender].exp += room.winScore
room.terjawab[index] = m.sender
}

let setting = global.db.data.settings[this.user.jid]
if (setting.composing) await this.sendPresenceUpdate('composing', m.chat)
if (setting.autoread) await this.readMessages([m.key])

let isWin = room.terjawab.length === room.terjawab.filter(v => v).length
let caption = `
*👨‍👩‍👧‍👦 Family 100 (Versi 2)*
❓ *Soal: ${room.soal}*
✏️ *Jawaban: ${room.jawaban.length} total${room.jawaban.find(v => v.includes(' ')) ? ' (ada yang mengandung spasi)' : ''}*
${isWin ? '\n🎉 *Semua jawaban berhasil ditemukan!*' : isSurrender ? '\n🙌 *Menyerah!*' : ''}
${room.jawaban.map((j, i) => {
return room.terjawab[i] || isSurrender
? `*(${i + 1}) ${j} ${room.terjawab[i] ? '— @' + room.terjawab[i].split('@')[0] : ''}*`
: false
}).filter(Boolean).join('\n')}
${!isSurrender ? `🎁 *+${room.winScore} XP tiap jawaban benar*` : ''}
`.trim()
let msg = await this.reply(m.chat, caption, null, { mentions: this.parseMention(caption) })
room.msg = msg
if (isWin || isSurrender) delete this.family2[id]
return !0
}

export const exp = 0