
let handler = async (m, { conn, text, usedPrefix, command }) => {
let [number, pesan] = text.split `|`
let mention = m.mentionedJid[0] 
? m.mentionedJid[0] 
: m.quoted 
? m.quoted.sender 
: number 
? number.replace(/[^0-9]/g, '') + '@s.whatsapp.net' 
: false
if (!number) return conn.reply(m.chat, `🍓 *Masukkan nomor tujuan yaa~*\n*Contoh: ${usedPrefix + command} 628xxxx|Halo manis~*`, m)
if (!pesan) return conn.reply(m.chat, `🍰 *Isi pesannya mana sayang?*\n*Contoh: ${usedPrefix + command} 628xxxx|Selamat pagi! Udah sarapan belum?*`, m)
if (text.length > 1000) return conn.reply(m.chat, '🍬 *Pesannya kepanjangan~ (max 1000 karakter)*', m)
let pengirim = m.sender
let penerima = mention
let isi = `💌 *「 EMAIL 」*\n\n🍡 *Dari: @${pengirim.replace(/@.+/, '')}*\n💬 *Pesan:*\n${pesan.trim()}\n\n🍓 *Salam manis~*\n${global.wm}`
await conn.reply(penerima, isi, null, { mentions: [pengirim] })
let logs = `🍡 *Pesan berhasil dikirim ke @${number.split('@')[0]}*`
conn.reply(m.chat, logs, m)
}

handler.help = ['email']
handler.tags = ['owner']
handler.command = /^(email)$/i
handler.owner = true

export default handler