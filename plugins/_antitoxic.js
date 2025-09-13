
let toxicRegex = /\b(anj(g|k|r)?|ajg|anjay|anjayani|bajingan|bgst|bangsat|bangsatt|bgsd|bgsat|bngst|kontol|k[0oae]?ntl|kuntul|memek|mmk|meki|pepek|ppek|peler|pler|titit|titid|tetek|toket|totong|ngaceng|sange|ngentot|ngentd|kentot|jembut|jmbt|bego|bego|goblok|gblk|tolol|idiet|idiot|pantek|pantat|jancok|jancuk|jnck|jngk|kampang|kampret|lonte|lonthe|pelacur|perek|sundal|coli|celen|henceut|kimak|kimek|kimax|kim4k|tai|tae|tahi|cibai|cbai|fuck|fck|fakyu|fuckyou|dick|bitch|btch|b1tch|titid|bastard|asshole|ass|puki|pukimak|ngtd|kudajingkrak|kehed|silit|bodat|asu|asw|asuwae|bedebah|sialan|ngadi-ngadi|jancoek|coeg|cuk|cukimay|gblk|ngntl|ngmemek|ngaceng)\b/i

export async function before(m) {
if (m.isBaileys || m.fromMe || !m.text) return
let chat = global.db.data.chats[m.chat]
let setting = global.db.data.settings[conn.user.jid]
let isGroupToxic = toxicRegex.exec(m.text)
let who = m.mentionedJid && m.mentionedJid.length ? m.mentionedJid[0] : m.fromMe ? conn.user.jid : m.sender
let isMods = [conn.decodeJid(conn.user.id), ...global.config.owner.filter(([num, _, dev]) => num && dev).map(([num]) => num)].map(v => v.replace(/\D/g, '') + '@s.whatsapp.net').includes(who)
if (chat.antiToxic && isGroupToxic && m.isGroup) {
if (setting.composing) await this.sendPresenceUpdate('composing', m.chat)
if (setting.autoread) await this.readMessages([m.key])
if (isMods) {
await m.reply(`🍬 *Ehh paduka Izumi, gaboleh gitu sayang~* 💕`)
} else {
await m.reply(`🔥 *Gak usah toxic dek, emang ini grup mu?*\n😠 *Kalau gak bisa sopan, mending diem.*`)
}
}
return !0
}