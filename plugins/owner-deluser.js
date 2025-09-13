
let handler = async (m, { conn, usedPrefix, command, text }) => {
function no(number) {
return number.replace(/\s/g, '').replace(/([@+-])/g, '')
}
if (!text && !m.quoted && !m.mentionedJid.length)
return conn.reply(m.chat, `🌸 *Nomornya mana?*\n*Contoh: ${usedPrefix}${command} 628xxxxxx*\n*Atau tag/reply user*`, m)
let number = text ? no(text) : m.quoted?.sender?.split('@')[0] || m.mentionedJid[0]?.split('@')[0]
if (!number) return conn.reply(m.chat, `🌸 *Nomor yang kamu masukkan tidak valid!*`, m)
let user = number + '@s.whatsapp.net'
if (!global.db.data.users[user])
return conn.reply(m.chat, `🌸 *Data user tidak ditemukan di database.*`, m)
delete global.db.data.users[user]
let pp = await conn.profilePictureUrl(user, 'image').catch(_ => "https://telegra.ph/file/24fa902ead26340f3df2c.png")
let caption = `🌸 *Berhasil menghapus ${conn.getName(user)} dari database.*\n*Semoga dia menemukan jalan yang baru~*`
conn.sendFile(m.chat, pp, 'pp.jpg', caption, m)
}

handler.help = ['deleteuser']
handler.tags = ['owner']
handler.command = /^(d(el)?(ete)?u(ser)?|ha?pu?su(ser)?)$/i
handler.owner = true

export default handler