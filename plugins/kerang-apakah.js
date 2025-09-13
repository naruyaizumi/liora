let handler = async (m, { conn, command, text }) => {
let caption = `
🍽️ *Pertanyaan: ${command} ${text}*
🍱 *Jawaban: ${pickRandom([
'🍕 Ya',
'🍜 Mungkin iya',
'🍣 Bisa jadi',
'🍩 Mungkin tidak',
'🍟 Tidak',
'🍔 Tidak mungkin',
'🍚 Tidak untuk sekarang',
'🥐 Kemungkinan kecil',
'🍛 Sangat mungkin',
'🥟 Bisa jika kamu mau',
'🍦 Gak juga sih',
'🍖 Yakin banget ya?',
'🍡 Pertanyaan sulit',
'🍢 Hanya waktu yang bisa jawab',
'🧁 Lebih baik tidak',
'🍿 Aku gak yakin juga',
'🍰 Sepertinya iya',
'🍫 Jangan terlalu berharap',
'🍬 Bisa iya bisa juga enggak',
'🧃 Fakta dan fiksi bercampur'
])}*
`.trim()
await conn.sendMessage(m.chat, { text: caption }, { quoted: m })
}

handler.help = ['apakah']
handler.tags = ['kerang']
handler.command = /^(apakah)$/i
handler.register = true

export default handler

function pickRandom(list) {
return list[Math.floor(Math.random() * list.length)]
}