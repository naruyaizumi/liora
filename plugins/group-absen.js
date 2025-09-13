
import fs from 'fs'
import path from 'path'

let handler = async (m, { conn, usedPrefix, command, text }) => {
let id = m.chat
let data = global.db.data.bots.absen[id]
if (!data) {
global.db.data.bots.absen[id] = {}
data = global.db.data.bots.absen[id]
}
switch (text) {
case 'start': {
if (data.tanggal) return m.reply(`🍩 *Masih ada absen aktif di grup ini~*\n\n*Ketik ${usedPrefix + command} delete untuk menghapus absen.*`)
m.reply('🍓 *Absen dimulai! Silakan ketik .absen atau .hadir ya~*')
data.tanggal = new Date() * 1
data.absen = []
data.close = false
break
}
case 'close': {
if (!data.tanggal) return m.reply(`🍰 *Belum ada absen aktif~*\n*Gunakan ${usedPrefix + command} start untuk memulai.*`)
if (data.close) return m.reply('🍬 *Absen sudah ditutup sebelumnya~*')
data.close = true
await m.reply('🍮 *Absen berhasil ditutup~*')
let metadata = await conn.groupMetadata(m.chat)
let allMembers = metadata.participants.map(p => p.id)
let tanggal = new Date(data.tanggal).toLocaleDateString('id', { day: 'numeric', month: 'long', year: 'numeric' })
let hasil = allMembers.map((jid, i) => ({
no: i + 1,
nomor: jid,
status: data.absen.includes(jid) ? '🔥 Hadir' : '🧊 Tidak Hadir'
}))
let output = {
tanggal,
grup: metadata.subject,
total: hasil.length,
absen: hasil
}
let jsonName = `absen-${metadata.id.split('@')[0]}.json`
let jsonPath = path.join('./tmp', jsonName)
fs.writeFileSync(jsonPath, JSON.stringify(output, null, 2))
await conn.sendMessage(m.chat, {
document: fs.readFileSync(jsonPath),
fileName: jsonName,
mimetype: 'application/json'
}, { quoted: m })
fs.unlinkSync(jsonPath)
break
}
case 'delete': {
if (!data.tanggal) return m.reply(`🍰 *Tidak ada data absen~*\n*Gunakan ${usedPrefix + command} start* untuk memulai.*`)
delete global.db.data.bots.absen[id]
m.reply('🧁 *Absen berhasil dihapus~*')
break
}
case 'cek': {
if (!data.tanggal) return m.reply(`🍰 *Belum ada absen dimulai~*\n*Gunakan ${usedPrefix + command} start untuk memulai.*`)
let d = new Date(data.tanggal)
let date = d.toLocaleDateString('id', { day: 'numeric', month: 'long', year: 'numeric' })
let metadata = await conn.groupMetadata(m.chat)
let allMembers = metadata.participants.map(p => p.id)
let list = allMembers.map((jid, i) => {
let status = data.absen.includes(jid) ? '🔥 Hadir' : '🧊 Tidak Hadir'
return `*│ ${i + 1}.* @${jid.split('@')[0]} ${status}`
}).join('\n')

m.reply(`
*「 ABSEN 」${data?.close ? " (DITUTUP)" : ""}*

📅 *Tanggal: ${date}*

*┌ Status Absen Anggota:*
${list}
*└────*
`.trim(), false, { contextInfo: { mentionedJid: allMembers } })
break
}
case 'help': {
m.reply(`
📖 *Panduan Absen:*
*${usedPrefix + command} start → Memulai absen*
${usedPrefix + command} delete → Menghapus data* absen*
${usedPrefix + command} cek → Melihat siapa saja yang sudah absen*
${usedPrefix + command} close → Menutup absen*
${usedPrefix + command} → Digunakan oleh member untuk absen*

🧁 *Gunakan dengan bijak ya sayang~*
`.trim())
break
}
default: {
if (!data.tanggal) return m.reply(`🍩 *Belum ada absen dimulai~*\n*Gunakan ${usedPrefix + command} start untuk memulai.*`)
if (data.close) return m.reply('🍓 *Absen sudah ditutup, tidak bisa absen lagi ya~*')
if (data.absen.includes(m.sender)) return m.reply('🍎 *Kamu sudah absen sayang~*')
data.absen.push(m.sender)
await m.reply('🧁 *Absen kamu berhasil dicatat, makasih ya~*')
let d = new Date(data.tanggal)
let date = d.toLocaleDateString('id', { day: 'numeric', month: 'long', year: 'numeric' })
let list = data.absen.map((v, i) => `*│ ${i + 1}.* @${v.split`@`[0]}`).join('\n')
await m.reply(`
📅 *Tanggal: ${date}*

*┌「 Daftar Absen 」*
*├ Total: ${data.absen.length}*
${list}
*└────*

🍬 *Untuk melihat panduan, ketik:*
*${usedPrefix + command} help*
`.trim(), false, { contextInfo: { mentionedJid: data.absen } })
break
}
}
}

handler.help = ['absen']
handler.tags = ['group']
handler.command = /^(absen|hadir)$/i
handler.group = true
handler.register = true

export default handler