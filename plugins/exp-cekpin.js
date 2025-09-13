
let handler = async function (m, { conn }) {
let user = global.db.data.users[m.sender]
if (!user.registered) return m.reply('*🚫 Kamu belum terdaftar!*\nSilakan daftar dengan `.daftar`')
if (!user.pin) return m.reply('*❌ PIN tidak ditemukan! Coba daftar ulang dengan `.unreg <PIN>` lalu `.daftar`*')

let caption = `🔐 *PIN : ${user.pin}*\n*Gunakan kode di atas untuk unreg!*`
m.reply(caption)
}

handler.help = ['cekpin']
handler.tags = ['xp']
handler.command = /^(cekpin)$/i
handler.register = true

export default handler