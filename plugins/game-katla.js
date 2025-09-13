
let handler = async (m, { conn, usedPrefix }) => {
conn.katla = conn.katla || {}
let id = m.chat
if (id in conn.katla) return
const WORDS_DB = [
'abadi', 'adopsi', 'aktif', 'alibi', 'amati', 'andal', 'angin', 'anjur', 'antik',
'apung', 'arang', 'asli', 'awal', 'badan', 'bagus', 'bahwa', 'bakar', 'balik',
'bantu', 'barat', 'baru', 'basah', 'batas', 'batin', 'bawah', 'bayar', 'beban',
'belum', 'benar', 'beri', 'besar', 'betul', 'biaya', 'bisa', 'bobot', 'bocor',
'bohong', 'bonus', 'buka', 'bulan', 'buruk', 'cabai', 'cair', 'cakap', 'campur',
'capai', 'cepat', 'cerah', 'cocok', 'dahan', 'damai', 'dasar', 'data', 'dekat',
'desak', 'detail', 'diam', 'duduk', 'dunia', 'emas', 'fokus', 'gagal', 'gaji',
'ganti', 'garis', 'gelap', 'gemar', 'gigi', 'gugur', 'guna', 'habis', 'hafal',
'hasil', 'hati', 'hemat', 'hujan', 'ideal', 'indah', 'ingat', 'jaga', 'jauh',
'jujur', 'kabar', 'kalah', 'karya', 'kata', 'kecil', 'keras', 'kilat', 'kotor',
'kuat', 'kunci', 'laku', 'lancar', 'langit', 'lebar', 'legal', 'lepas', 'lucu',
'makan', 'malu', 'manis', 'masuk', 'mata', 'minum', 'modal', 'muda', 'murah',
'nanti', 'nyata', 'olah', 'pagar', 'palsu', 'panas', 'papan', 'pasal', 'pasti',
'pilih', 'putih', 'radio', 'ragu', 'ramah', 'rapi', 'rasa', 'rawat', 'rendah',
'ruang', 'sabar', 'sakit', 'salah', 'sama', 'sampai', 'satu', 'sehat', 'siap',
'sulit', 'takut', 'tambah', 'tanda', 'tanya', 'tebak', 'teman', 'tepat', 'terang',
'tidak', 'tiru', 'tolak', 'tulis', 'uang', 'uji', 'umum', 'unik', 'waktu', 'warna',
'yakin', 'zaman'
]
const secretWord = WORDS_DB[Math.floor(Math.random() * WORDS_DB.length)]
conn.katla[id] = [
await conn.reply(m.chat,
`🎮 *GAME KATLA DIMULAI!*\n\n` +
`🔤 *Tebak kata 5 huruf dari KBBI*\n\n` +
`❔ *Petunjuk:*\n` +
`🟩 *Huruf benar & posisi tepat*\n` +
`🟨 *Huruf benar, posisi salah*\n` +
`⬛️ *Huruf tidak ada*\n\n` +
`📝 *Cara main:*\n` +
`*_Balas pesan ini untuk menjawabnya_*\n` +
`*Contoh: "MATA"*\n\n` +
`⏱️ *Waktu: 2 menit*\n` +
`♻️ *Kesempatan: 6x*`,
m
),
{
secret: secretWord,
guesses: [],
remaining: 6,
words: WORDS_DB,
startTime: Date.now()
},
setTimeout(() => {
if (conn.katla[id]) {
conn.reply(m.chat, `⏰ *Waktu habis!*\nJawaban: *${secretWord.toUpperCase()}*`, conn.katla[id][0])
delete conn.katla[id]
}
}, 120000)
]
}

handler.help = ['katla']
handler.tags = ['game']
handler.command = /^(katla)$/i
handler.register = true
handler.limit = true
handler.group = true

export default handler