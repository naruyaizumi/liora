let handler = async function (m, { args, usedPrefix, command }) {
if (!global.db.data.users[m.sender]?.registered)
return m.reply(`🍡 *Kamu belum terdaftar~*\nSilakan daftar dulu dengan *${usedPrefix}daftar yaa!*`)
if (!args[0])
return m.reply(`🔐 *Masukkan PIN untuk menghapus akunmu!*\n*Contoh: ${usedPrefix + command} 123456*\n*Kalau lupa, ketik ${usedPrefix}cekpin*`)
let user = global.db.data.users[m.sender]
if (String(args[0]) !== String(user.pin))
return m.reply(`❌ *PIN-nya salah, sayang~*\nCek lagi pakai *${usedPrefix}cekpin* yaa!`)
let name = user.name
let age = user.age
delete global.db.data.users[m.sender]
m.reply(`🌸 *Data kamu berhasil dihapus dari database.*\n🫧 *Nama: ${name}*\n🎂 *Umur: ${age} tahun*\n\n*Terima kasih sudah bersama kami~ Semoga kita bisa bertemu lagi nanti yaa~*`)
}

handler.help = ['unreg']
handler.tags = ['xp']
handler.command = /^unreg(ister)?$/i
handler.register = true

export default handler