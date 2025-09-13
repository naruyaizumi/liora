
let handler = async (m, { conn, command, args, usedPrefix }) => {
let type = (args[0] || '').toLowerCase()
let users = global.db.data.users[m.sender]
let time = users.lastkerja + 300000
let __timers = (new Date - users.lastkerja)
let _timers = (0 - __timers)
let timers = clockString(_timers)
if (/kerja/i.test(command)) {
if (new Date - users.lastkerja < 300000) return m.reply(`🍡 *Kamu sudah bekerja, istirahat dulu ya selama ⏱️ ${timers}*`)
let gaji = () => Math.floor(Math.random() * 150000) + 10000
switch (type) {
case 'ojek':
m.reply(`🍭 *Kamu mengantar penumpang keliling desa naik motor tuamu, dan dapat bayaran sebesar Rp ${toRupiah(gaji())}* ${global.rpg.emoticon('money')}`).then(() => {
users.money += gaji()
users.lastkerja = new Date * 1
})
break
case 'pedagang':
m.reply(`🍬 *Kamu membuka lapak sayur di pasar tradisional dan laku keras hari ini! Untung bersih Rp ${toRupiah(gaji())}* ${global.rpg.emoticon('money')}`).then(() => {
users.money += gaji()
users.lastkerja = new Date * 1
})
break
case 'dokter':
m.reply(`🍩 *Kamu bantu obati warga desa yang demam dan cedera kecil. Mereka berterima kasih dan memberi kamu Rp ${toRupiah(gaji())}* ${global.rpg.emoticon('money')}`).then(() => {
users.money += gaji()
users.lastkerja = new Date * 1
})
break
case 'petani':
m.reply(`🍓 *Hasil panenmu hari ini melimpah! Kamu jual hasil tani di pasar dan dapat Rp ${toRupiah(gaji())}* ${global.rpg.emoticon('money')}`).then(() => {
users.money += gaji()
users.lastkerja = new Date * 1
})
break
case 'montir':
m.reply(`🍫 *Kamu bantu betulin motor warga yang mogok di tengah sawah. Dapet upah Rp ${toRupiah(gaji())}* ${global.rpg.emoticon('money')}`).then(() => {
users.money += gaji()
users.lastkerja = new Date * 1
})
break
case 'kuli':
m.reply(`🍪 *Kamu bantu bangun pos ronda di ujung kampung, keringetan tapi puas. Dapet bayaran Rp ${toRupiah(gaji())}* ${global.rpg.emoticon('money')}`).then(() => {
users.money += gaji()
users.lastkerja = new Date * 1
})
break
case 'pemancing':
m.reply(`🍥 *Kamu mancing ikan di sungai belakang rumah, hasilnya lumayan! Kamu jual dan dapet Rp ${toRupiah(gaji())}* ${global.rpg.emoticon('money')}`).then(() => {
users.money += gaji()
users.lastkerja = new Date * 1
})
break
case 'penambang':
m.reply(`🍯 *Kamu turun ke tambang tua, nemu batu mulia dan dijual seharga Rp ${toRupiah(gaji())}* ${global.rpg.emoticon('money')}`).then(() => {
users.money += gaji()
users.lastkerja = new Date * 1
})
break
case 'pemahat':
m.reply(`🍮 *Kamu bikin patung kecil dari kayu jati dan dijual ke wisatawan. Dapet bayaran Rp ${toRupiah(gaji())}* ${global.rpg.emoticon('money')}`).then(() => {
users.money += gaji()
users.lastkerja = new Date * 1
})
break
case 'tukangkayu':
m.reply(`🍘 *Kamu bantu buat kursi bambu pesanan tetangga. Dapet upah Rp ${toRupiah(gaji())}* ${global.rpg.emoticon('money')}`).then(() => {
users.money += gaji()
users.lastkerja = new Date * 1
})
break
default:
return m.reply(`
*╭─〔 Pekerjaan yang Tersedia 〕─⬣*
*│ 🍡 ojek*
*│ 🍡 pedagang*
*│ 🍡 dokter*
*│ 🍡 petani*
*│ 🍡 montir*
*│ 🍡 kuli*
*│ 🍡 pemancing*
*│ 🍡 penambang*
*│ 🍡 pemahat*
*│ 🍡 tukangkayu*
*╰───────────────⬣*
📌 *Contoh penggunaan:*
*${usedPrefix}kerja petani*`)
}
}
}

handler.help = ['kerja']
handler.tags = ['rpg']
handler.command = /^(kerja|work)$/i
handler.register = true
handler.group = true
handler.rpg = true
handler.energy = 10

export default handler

function clockString(ms) {
let h = Math.floor(ms / 3600000)
let m = Math.floor(ms / 60000) % 60
let s = Math.floor(ms / 1000) % 60
return [h, m, s].map(v => v.toString().padStart(2, 0)).join(':')
}

const toRupiah = number => parseInt(number).toLocaleString().replace(/,/g, ',')