
let handler = async (m, { conn, isMods, isOwner, isPrems, usedPrefix }) => {
let user = global.db.data.users[m.sender]
let pp = await conn.profilePictureUrl(m.sender, 'image').catch(_ => 'https://i.supa.codes/tsUECa')
let caption = `
📌 *Nama: ${user.registered ? user.name : await conn.getName(m.sender)}*
👑 *Status: ${isMods ? '✨ Developer' : isOwner ? '👑 Owner' : isPrems ? '💎 Premium' : user.level > 999 ? '🔥 Elite' : '👤 Free User'}*
`.trim()
await conn.sendFile(m.chat, pp, null, caption, m)
}

handler.help = ["account"]
handler.tags = ["main"]
handler.command = /^(acc(ount)?)$/i
handler.register = true

export default handler

const toRupiah = number => parseInt(number).toLocaleString('id-ID')