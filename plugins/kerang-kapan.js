let handler = async (m, { conn, command, text }) => {
let caption = `
🍽️ *Pertanyaan: ${command} ${text}*
🍱 *Jawaban: ${pickRandom([
'🍕 Besok',
'🍜 Nanti malam',
'🍣 Minggu depan',
'🍩 Saat kamu berhenti stalking dia',
'🍟 Ketika hujan turun dan pelangi muncul',
'🍔 Waktu yang tepat belum datang',
'🍚 Tunggu update terbaru',
'🥐 Setelah kamu move on',
'🍛 Mungkin gak akan pernah',
'🥟 Sekarang juga!',
'🍦 Saat kamu udah siap',
'🍖 Pas kamu lagi gak mikirin itu',
'🍡 Kalau semesta mengizinkan',
'🍢 Setelah baterai HP kamu full',
'🧁 Kalau doi bales chat kamu',
'🍿 Setelah kamu mandi dan gak rebahan terus',
'🍰 Tunggu tanda-tanda dari langit',
'🍫 Saat semuanya terasa pas',
'🍬 Gak ada yang tahu, bahkan Tuhan pun diem',
'🧃 Saat kamu stop overthinking'
])}*
`.trim()
await conn.sendMessage(m.chat, { text: caption }, { quoted: m })
}

handler.help = ['kapan']
handler.tags = ['kerang']
handler.command = /^(kapan)$/i
handler.register = true

export default handler

function pickRandom(list) {
return list[Math.floor(Math.random() * list.length)]
}