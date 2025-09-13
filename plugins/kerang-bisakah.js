
let handler = async (m, { conn, command, text }) => {
let caption = `
🍽️ *Pertanyaan: ${command} ${text}*
🍱 *Jawaban: ${pickRandom([
'🍕 Bisa',
'🍜 Sangat mungkin',
'🍣 Tergantung niat',
'🍩 Sulit tapi bisa',
'🍟 Tidak bisa',
'🍔 Mustahil',
'🍚 Butuh bantuan orang lain',
'🥐 Perlu waktu',
'🍛 Tidak sekarang',
'🥟 Harus dicoba dulu',
'🍦 Jangan terlalu berharap',
'🍖 Bisa, tapi jangan maksa',
'🍡 Coba saja dulu',
'🍢 Hanya Tuhan yang tahu',
'🧁 Tentu bisa, jika kamu percaya',
'🍿 Gak ada yang gak mungkin',
'🍰 Butuh usaha ekstra',
'🍫 Bisa, tapi ada harga yang harus dibayar'
])}*
`.trim()
await conn.sendMessage(m.chat, { text: caption }, { quoted: m })
}

handler.help = ['bisakah']
handler.tags = ['kerang']
handler.command = /^(bisakah)$/i
handler.register = true

export default handler

function pickRandom(list) {
return list[Math.floor(Math.random() * list.length)]
}