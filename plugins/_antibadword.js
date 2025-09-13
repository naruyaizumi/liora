let badwordRegex = /\b(anj(g|k|r)?|ajg|anjay|anjayani|bajingan|bgst|bangsat|bangsatt|bgsd|bgsat|bngst|kontol|kntl|k*ntl|kuntul|memek|mmk|meki|pepek|ppek|peler|pler|titit|titid|tetek|toket|totong|ngaceng|sange|ngentot|ngentd|kentot|jembut|jmbt|bego|bego|goblok|gblk|tolol|idiet|idiot|pantek|pantat|jancok|jancuk|jnck|jngk|kampang|kampret|lonte|lonthe|pelacur|perek|sundal|coli|celen|henceut|kimak|kimek|kimax|kim4k|tai|tae|tahi|cibai|cbai|fuck|fck|fakyu|fuckyou|dick|d*k|bitch|btch|b1tch|titid|bastard|asshole|ass|puki|pukimak|ngtd|kudajingkrak|kehed|silit|bodat|asu|asw|asuwae|bedebah|sialan|ngadi-ngadi|jancoek|coeg|cuk|cukimay|gblk|ngntl|ngmemek|ngaceng)\b/i

export async function before(m, { isBotAdmin, isAdmin }) {
if (m.isBaileys || m.fromMe) return
let chat = global.db.data.chats[m.chat]
let user = global.db.data.users[m.sender]
let setting = global.db.data.settings[conn.user.jid]
let who = m.mentionedJid && m.mentionedJid.length ? m.mentionedJid[0] : m.fromMe ? conn.user.jid : m.sender
let isMods = [conn.decodeJid(conn.user.id), ...global.config.owner.filter(([num, _, dev]) => num && dev).map(([num]) => num)].map(v => v.replace(/\D/g, '') + '@s.whatsapp.net').includes(who)
let isBadword = badwordRegex.exec(m.text)
if (chat.antiBadword && isBadword && m.isGroup) {
if (isMods) return
if (!isAdmin) {
user.warning += 1
await conn.sendMessage(m.chat, { delete: m.key })
if (setting.composing) await this.sendPresenceUpdate('composing', m.chat)
if (setting.autoread) await this.readMessages([m.key])
await m.reply(`${user.warning >= 15 ? '⛔️ *Kamu sudah mencapai batas maksimal warning dan akan dikeluarkan dari grup.*' : '⚠️ *Kata kasar terdeteksi!*'}

🍬 *Warning: ${user.warning} / 15*

📝 *Jaga etika dan suasana grup ya*
😇 *Yuk pakai kata-kata yang lebih positif~*
${user.warning >= 15 ? '' : '🔥 *Setelah 15 warning, kamu akan otomatis dikeluarkan dari grup*'}
`)
if (user.warning >= 15) {
user.warning = 0
conn.groupParticipantsUpdate(m.chat, [m.sender], 'remove')
}
}
}
return !0
}