
const paptt = [
"https://telegra.ph/file/5c62d66881100db561c9f.mp4",
"https://telegra.ph/file/a5730f376956d82f9689c.jpg",
"https://telegra.ph/file/8fb304f891b9827fa88a5.jpg",
"https://telegra.ph/file/0c8d173a9cb44fe54f3d3.mp4",
"https://telegra.ph/file/b58a5b8177521565c503b.mp4",
"https://telegra.ph/file/34d9348cd0b420eca47e5.jpg",
"https://telegra.ph/file/73c0fecd276c19560133e.jpg",
"https://telegra.ph/file/af029472c3fcf859fd281.jpg",
"https://telegra.ph/file/0e5be819fa70516f63766.jpg",
"https://telegra.ph/file/29146a2c1a9836c01f5a3.jpg",
"https://telegra.ph/file/85883c0024081ffb551b8.jpg",
"https://telegra.ph/file/d8b79ac5e98796efd9d7d.jpg",
"https://telegra.ph/file/267744a1a8c897b1636b9.jpg"
]

let handler = async (m, { conn }) => {
if (!paptt || !paptt.length) return m.reply('Maaf, belum ada media tersedia.')
let url = paptt[Math.floor(Math.random() * paptt.length)]
try {
await conn.sendFile(m.chat, url, null, '*Tch, dasar sangean*', m)
} catch (e) {
m.reply('Gagal mengirim media.')
}
}

handler.help = ['paptt']
handler.tags = ['nsfw']
handler.command = /^(paptt)$/i
handler.premium = true
handler.register = true

export default handler