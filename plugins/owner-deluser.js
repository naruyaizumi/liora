let handler = async (m, { conn, usedPrefix, command, text }) => {
const normalize = s => String(s || '').replace(/\s+/g, '').replace(/[@+.-]/g, '')
if (!text && !m.quoted && !(m.mentionedJid && m.mentionedJid.length))
return conn.reply(m.chat, `🌸 *Nomornya mana?*\n*Contoh:* ${usedPrefix + command} 628xxxxxx\n*Atau tag/reply user*`, m)
const baseNumber =
text ? normalize(text)
: m.quoted?.sender?.split('@')[0]
|| m.mentionedJid?.[0]?.split('@')[0]
if (!baseNumber) return conn.reply(m.chat, `🌸 *Nomor yang kamu masukkan tidak valid!*`, m)
let target = baseNumber + '@s.whatsapp.net'
if (!global.db?.data) await global.loadDatabase()
if (!global.db.data.users[target])
return conn.reply(m.chat, `🌸 *Data user tidak ditemukan di database.*`, m)
let name = global.db.data.users[target].name || await conn.getName(target)
delete global.db.data.users[target]
let pp = await conn.profilePictureUrl(target, 'image')
.catch(_ => 'https://telegra.ph/file/24fa902ead26340f3df2c.png')
let caption = `🌸 *Berhasil menghapus ${name} dari database.*\n*Semoga dia menemukan jalan yang baru~*`
await conn.sendFile(m.chat, pp, 'pp.jpg', caption, m)
}

handler.help = ['deleteuser']
handler.tags = ['owner']
handler.command = /^(d(el)?(ete)?u(ser)?|ha?pu?su(ser)?)$/i
handler.owner = true

export default handler