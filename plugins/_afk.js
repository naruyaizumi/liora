export async function before(m) {
if (m.isBaileys || m.fromMe) return
if (!m.text && !/sticker|image/i.test(m.mediaType)) return
let user = global.db.data.users[m.sender]
let setting = global.db.data.settings[this.user.jid]
if (user.afk > -1) {
if (setting.autoread) await this.readMessages([m.key])
if (setting.composing) await this.sendPresenceUpdate('composing', m.chat)
await m.reply(`
🍡 @${m.sender.split('@')[0]} berhenti AFK${user.afkReason ? ' setelah ' + user.afkReason : ''}
⏰ Selama ${(new Date - user.afk).toTimeString()}
`.trim(), null, { mentions: [m.sender] })
user.afk = -1
user.afkReason = ''
}
let jids = [...new Set([...(m.mentionedJid || []), ...(m.quoted ? [m.quoted.sender] : [])])]
for (let jid of jids) {
let users = global.db.data.users[jid]
if (!users) continue
if (!users.afk || users.afk < 0) continue
if (setting.composing) await this.sendPresenceUpdate('composing', m.chat)
if (setting.autoread) await this.readMessages([m.key])
await m.reply(`
🍓 Jangan tag dia!
💤 Dia sedang AFK ${users.afkReason ? 'dengan alasan ' + users.afkReason : 'tanpa alasan'}
⏰ Sudah AFK selama ${(new Date - users.afk).toTimeString()}
`.trim())
}

return !0
}