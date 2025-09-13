import moment from 'moment-timezone'

let handler = async (m, { conn, args, usedPrefix, command }) => {
let who = m.mentionedJid && m.mentionedJid[0] ? m.mentionedJid[0] : m.quoted ? m.quoted.sender : args[0] ? args[0].replace(/[^0-9]/g, '') + '@s.whatsapp.net' : false
if (!who) return m.reply('🍓 *Masukkan nomor atau tag orangnya dulu dong~*')
if (!global.db.data.users[who]) return m.reply(`🚫 *User belum terdaftar! Ketik ${usedPrefix}daftar dulu ya~*`)
let user = global.db.data.users[who]
let txt = args[1]
if (!txt) return m.reply('🍰 *Masukkan jumlah hari premium-nya ya sayang~*')
if (isNaN(txt)) return m.reply(`🥺 *Yang dimasukkan harus angka ya!*\n\n*Contoh: ${usedPrefix + command} @${m.sender.split`@`[0]} 7*`)
let jumlahHari = 86400000 * txt
let now = new Date() * 1
user.premiumTime = now < user.premiumTime ? user.premiumTime + jumlahHari : now + jumlahHari
user.premium = true
let timers = user.premiumTime - now
let sisaJam = Math.floor(timers / 3600000) % 24
let sisaMenit = Math.floor(timers / 60000) % 60
let sisaDetik = Math.floor(timers / 1000) % 60
let countdown = `${Math.floor(timers / 86400000)} hari ${sisaJam} jam ${sisaMenit} menit ${sisaDetik} detik`
let capUser = `
🎀 *𝗣𝗿𝗲𝗺𝗶𝘂𝗺 𝗔𝗸𝘁𝗶𝗳!* 🎀
────────────────────────
🍓 *Nama: ${user.name}*
🧁 *Durasi: ${txt} hari*
⏳ *Sisa Waktu: ${countdown}*
────────────────────────
🌷 Nikmati fitur spesial dari Riselia yaa~ semangat petualangannya~!
`.trim()
await conn.sendMessage(who, {
text: capUser
}, { quoted: m })
await delay(1000)
await m.reply(`🍨 *Sukses menambahkan premium untuk ${user.name} selama ${txt} hari!*`)
}

handler.help = ['addprem']
handler.tags = ['owner']
handler.command = /^(add(prem|premium))$/i
handler.owner = true

export default handler

const delay = time => new Promise(res => setTimeout(res, time))