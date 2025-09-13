
let handler = async (m, { conn, usedPrefix, command, text }) => {
let who = m.mentionedJid[0] ? m.mentionedJid[0] : m.quoted ? m.quoted.sender : text ? text.replace(/[^0-9]/g, '') + '@s.whatsapp.net' : false
if (!who) return m.reply(`❀ *Tag atau reply orang yang mau kamu tembak dong, sayang~*\n\n*Contoh: ${usedPrefix + command} @${m.sender.split('@')[0]}*`, false, { mentions: [m.sender] })
if (who === conn.user.jid) return m.reply(`🤖 *Yah... kamu nembak aku? Tapi aku cuma bot, sayang~ gak bisa pacaran sama user... hiks hiks!*`)
let user = global.db.data.users
if (!user[who]) return m.reply(`✘ *Eh kok dia belum terdaftar ya?*`)
if (user[who].pacar == m.sender) return m.reply(`💗 *Udah jadi pacar kamu tuh, jangan halu dong~*`)
if (user[who].pacar != "") return m.reply(`💔 *Duh, dia udah punya pacar... Sakit nggak tuh?*`)
if (user[who].tembak == m.sender) return m.reply(`⌛ *Kamu udah nembak dia, sabar nunggu jawaban dong hehe~*`)
if (user[who].tembak != "") return m.reply(`📨 *Uhhh... dia lagi ditembak orang lain, saingan berat nih!*`, false, { mentions: [user[who].tembak] })
if (user[m.sender].pacar != "") return m.reply(`🚫 *Kamu udah punya pacar! Selingkuh? Nggak banget deh...*`)
if (user[m.sender].tembak != "") return m.reply(`📌 *Kamu masih nunggu jawaban dari @${user[m.sender].tembak.split("@")[0]}*\n*Selesaikan dulu dong, baru move on~*`, false, { mentions: [user[m.sender].tembak] })
if (who == m.sender) return m.reply(`🙃 *Ngaca dulu deh, masa nembak diri sendiri?*`)

user[who].tembak = m.sender
user[who].ditembak = true
user[m.sender].tembak = who
user[m.sender].ditembak = false

await m.reply(`💘 *Kamu udah nembak @${who.split("@")[0]} buat jadi pasangan kamu!*\n\n*Sekarang tinggal nunggu dia jawab yaaa~*\n\n*✿ Kalau dia mau terima:*\n*➤ ${usedPrefix}terima*\n*✿ Kalau dia mau nolak:*\n*➤ ${usedPrefix}tolak*`, false, { mentions: [who] })
}

handler.help = ['tembak']
handler.tags = ['fun']
handler.command = /^(tembak)$/i
handler.group = true
handler.register = true

export default handler