import moment from 'moment-timezone'

export async function before(m) {
if (!/orderMessage/i.test(m.mtype)) return

let setting = global.db.data.settings[this.user.jid]
let user = global.db.data.users[m.sender]
let name = user.registered ? user.name : m.name
if (/premium/i.test(m.message.orderMessage.orderTitle)) {
try {
if (setting.autoread) await this.readMessages([m.key])
if (setting.composing) await this.sendPresenceUpdate('composing', m.chat)
await global.loading(m, this)

let caption = `
❏ *_Harga Premium Bot_*
*❃ _10 Hari / 10k_*
*❃ _15 Hari / 15k_*
*❃ _20 Hari / 20k_*
*❃ _25 Hari / 25k_*
*❃ _30 Hari / 30k_*

❏ *_Fitur_*
*❃ _Unlimited Limit_*
*❃ _Nsfw_*
*❃ _Free Akses Private Chat_*
*❃ _Dan Lain Lain_*

*Minat? Silahkan Chat Nomor Owner Dibawah:*
${global.config.owner.map(([jid, name]) => {
return `*Name : ${name}*\n*wa.me/${jid}*`
}).join('\n\n')}

*Atau Ketik:*
*.premium 10 hari*`.trim()

await this.sendMessage(m.chat, {
text: `🎀 Halo ${name}, ${wish()}\n\n${caption}`
}, { quoted: m })
} finally {
await global.loading(m, this, true)
}

} else if (/sewa|group/i.test(m.message.orderMessage.orderTitle)) {
try {
if (setting.autoread) await this.readMessages([m.key])
if (setting.composing) await this.sendPresenceUpdate('composing', m.chat)
await global.loading(m, this)

let teks = `
❏ *_Harga Sewa Bot_*
*❃ _10 Hari / 15k / group_*
*❃ _15 Hari / 20k / group_*
*❃ _20 Hari / 25k / group_*
*❃ _25 Hari / 30k / group_*
*❃ _30 Hari / 35k / group_*

❏ *_Fitur_*
❃ _Antilink_
❃ _Welcome_
❃ _Enable_
❃ _Store List_
❃ _Promote/Demote_
❃ _HideTag_
❃ _Dan Lain Lain_

*Minat? Silahkan Chat Nomor Owner Dibawah:*

${global.config.owner.map(([jid, name]) => {
return `*Name : ${name}*\n*https://wa.me/${jid}*`
}).join('\n\n')}`.trim()
await this.sendMessage(m.chat, {
text: `🎀 Halo ${name}, ${wish()}\n\n${teks}`
}, { quoted: m })
} finally {
await global.loading(m, this, true)
}
}
}

function wish() {
let time = moment.tz('Asia/Jakarta').format('HH')
if (time >= 0 && time < 4) return 'Selamat Malam'
if (time >= 4 && time < 11) return 'Selamat Pagi'
if (time >= 11 && time < 15) return 'Selamat Siang'
if (time >= 15 && time < 18) return 'Selamat Sore'
return 'Selamat Malam'
}

let toRupiah = number => parseInt(number).toLocaleString('id-ID')