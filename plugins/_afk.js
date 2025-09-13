export async function before(m) {
if (m.isBaileys || m.fromMe) return
if (!m.text && !/sticker|image/i.test(m.mediaType)) return
let user = global.db.data.users[m.sender]
let setting = global.db.data.settings[conn.user.jid]
let isMods = [conn.decodeJid(conn.user.id), ...global.config.owner.filter(([num, _, dev]) => num && dev).map(([num]) => num)].map(v => v.replace(/\D/g, '') + '@s.whatsapp.net').includes(m.sender)
if (user.afk > -1) {
if (setting.autoread) await this.readMessages([m.key])
if (setting.composing) await this.sendPresenceUpdate('composing', m.chat)
if (isMods) {
await m.reply(`📨 *Paduka telah kembali dari AFK.*\n*Selamat datang kembali, semoga semuanya berjalan lancar seperti biasa.*`, false)
} else {
await m.reply(`🎉 *Kamu sudah kembali dari AFK!* 😗\n*@${m.sender.split('@')[0]} berhenti AFK${user.afkReason ? ' setelah ' + user.afkReason : ''}*\n⏰ *Selama ${(new Date - user.afk).toTimeString()}*`, false, { mentions: [m.sender] })
}
user.afk = -1
user.afkReason = ''
}
let jids = [...new Set([...(m.mentionedJid || []), ...(m.quoted ? [m.quoted.sender] : [])])]
for (let jid of jids) {
let afkUser = global.db.data.users[jid]
if (!afkUser || afkUser.afk < 0) continue
if (setting.composing) await this.sendPresenceUpdate('composing', m.chat)
if (setting.autoread) await this.readMessages([m.key])
let isMentionedMods = [conn.decodeJid(conn.user.id), ...global.config.owner.filter(([num, _, dev]) => num && dev).map(([num]) => num)].map(v => v.replace(/\D/g, '') + '@s.whatsapp.net').includes(jid)
if (isMentionedMods && !isMods) {
await m.reply(`🚫 *TOLOL!*
*Lu kira punya waktu buat bales tag random dari bocah gak penting?*
📛 *AFK Dek! ${afkUser.afkReason ? `(${afkUser.afkReason})` : ''}*
⏰ *Udah lama banget, jangan sok ganggu.*
*Lain kali mikir dulu pake otak sebelum tag!*`, false)
continue
}
if (isMods && !isMentionedMods) {
await m.reply(`📣 @${jid.split('@')[0]} *WOE BALIK WOEE!!!* 😡
🫧 *Kamu dipanggil sama paduka nih!*
⏰ *${jid.split('@')[0]} *AFK selama ${(new Date - afkUser.afk).toTimeString()}${afkUser.afkReason ? ` dengan alasan: ${afkUser.afkReason}*` : ''}
⚠️ *Gak balik? Siap-siap di-KICK!*`, false, { mentions: [jid] })
continue
}
await m.reply(`🍃 *Maaf ya...*
@${jid.split('@')[0]} *lagi AFK~${afkUser.afkReason ? ` karena: ${afkUser.afkReason}*` : ''}
⏰ *Sudah AFK selama ${(new Date - afkUser.afk).toTimeString()}*`, false, { mentions: [jid] })
}
return !0
}