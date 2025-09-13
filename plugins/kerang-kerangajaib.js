let handler = async (m, { conn, text, command, usedPrefix }) => {
if (!text) return conn.sendMessage(m.chat, { text: `📌 *Contoh: ${usedPrefix + command} Apakah aku boleh makan*` }, { quoted: m })
let caption = `
🍽️ *Pertanyaan: ${text}*
🍱 *Jawaban: ${pickRandom([
'🍕 Mungkin suatu hari',
'🍜 Tidak juga',
'🍣 Tidak keduanya',
'🍩 Kurasa tidak',
'🍟 Ya',
'🍔 Boleh',
'🍚 Mungkin',
'🥐 Ya, mungkin',
'🍛 Coba tanya lagi',
'🥟 Tidak ada',
'🍦 Kamu sudah tahu jawabannya',
'🍖 Jangan harap terlalu tinggi',
'🍡 Semua tergantung moodku',
'🍢 Bisa, tapi jangan berharap',
'🧁 Gak tau, kerang lagi ngambek',
'🍿 Hanya kamu yang bisa menjawab',
'🍰 Aku malas jawab, cari jawaban sendiri',
'🍫 Jawaban ini mungkin tidak valid',
'🍬 Ngapain nanya kerang ajaib terus sih?'
])}*
`.trim()
await conn.sendMessage(m.chat, { text: caption }, { quoted: m })
}

handler.help = ['kerangajaib']
handler.tags = ['kerang']
handler.command = /^(kulit)?kerang(ajaib)?$/i
handler.register = true

export default handler

function pickRandom(list) {
return list[Math.floor(Math.random() * list.length)]
}