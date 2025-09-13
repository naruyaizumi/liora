let handler = async (m, { conn, command, text }) => {
let caption = `
🍽️ *Pertanyaan: ${command} ${text}*
🍱 *Jawaban: ${pickRandom([
'🍕 Iya',
'🍜 Sudah pasti',
'🍣 Kemungkinan besar benar',
'🍩 Bisa jadi',
'🍟 Sepertinya tidak',
'🍔 Sudah pasti tidak',
'🍚 Hanya dugaan',
'🥐 Terlalu dini untuk disimpulkan',
'🍛 Fakta lapangan membenarkan',
'🥟 Tidak masuk akal',
'🍦 Agak meragukan',
'🍖 Jangan percaya 100%',
'🍡 Benar, tapi tidak sepenuhnya',
'🍢 Salah kaprah',
'🧁 Hanya asumsi',
'🍿 Bisa benar jika kondisinya tepat',
'🍰 Sudut pandangnya salah',
'🍫 Perlu bukti lebih kuat',
'🍬 Benar, tapi tidak mutlak'
])}*
`.trim()
await conn.sendMessage(m.chat, { text: caption }, { quoted: m })
}

handler.help = ['benarkah']
handler.tags = ['kerang']
handler.command = /^(benarkah)$/i
handler.register = true

export default handler

function pickRandom(list) {
return list[Math.floor(Math.random() * list.length)]
}