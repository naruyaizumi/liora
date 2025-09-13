
let handler = async (m, { conn, command, args, usedPrefix }) => {
let type = (args[0] || '').toLowerCase()
let user = global.db.data.users[m.sender]
let harga = {
cat: 50,
dog: 80,
horse: 150,
fox: 250,
dragon: 400,
lion: 500,
rhinoceros: 550,
centaur: 600,
scorpion: 650,
griffin: 700,
wolf: 750,
phoenix: 999
}
if (!type || !Object.keys(harga).includes(type)) {
let logo = `— *P E T   S T O R E* —
▮▧▧▧▧▧▧▧▧▧▧▧▧▮`
let caption = `
🐱 *Cat: ${harga.cat}* 🔖
🐶 *Dog: ${harga.dog}* 🔖
🐴 *Horse: ${harga.horse}* 🔖
🦊 *Fox: ${harga.fox}* 🔖
🐉 *Dragon: ${harga.dragon}* 🔖
🦁 *Lion: ${harga.lion}* 🔖
🦏 *Rhinoceros: ${harga.rhinoceros}* 🔖
🐐 *Centaur: ${harga.centaur}* 🔖
🦂 *Scorpion: ${harga.scorpion}* 🔖
🦅 *Griffin: ${harga.griffin}* 🔖
🐺 *Wolf: ${harga.wolf}* 🔖
🐦‍🔥 *Phoenix: ${harga.phoenix}* 🔖

》 *ABILITY*
🐶 Dog: Diskon item 1% per level
🐦‍🔥 Phoenix: Regen darah tiap 10 menit berdasarkan level

》 *Contoh Pembelian*
*${usedPrefix}adopt phoenix*

📌 *Semua hewan peliharaan dibeli menggunakan Pet Token!* 🍬
🎁 *Bonus: Setiap pembelian akan mendapatkan 10 pet food gratis~* 🍓
`.trim()
return m.reply(logo + "\n" + caption)
}
if (user[type] >= 1) return m.reply(`*Kamu sudah memiliki ${type}! Tidak bisa membeli dua kali, yaa~* 🍰`)
if (user.pet < harga[type]) return m.reply(`*Pet Token kamu tidak cukup! Butuh ${harga[type]} 🍭, kamu cuma punya ${user.pet}~*`)
user[type] = 1
user.pet -= harga[type]
user.petfood = (user.petfood || 0) + 10
await m.reply(`*Yatta~! Kamu berhasil mengadopsi ${type}~!* 🎉\n*Sebagai bonus manis, kamu dapat 10 pet food gratis~* 🍓🍩🍬`)
}

handler.help = ['petshop']
handler.tags = ['rpg']
handler.command = /^(pet(shop|store)?|adopt)/i
handler.register = true
handler.group = true
handler.rpg = true

export default handler