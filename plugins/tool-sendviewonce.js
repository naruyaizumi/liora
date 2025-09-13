/* TODO...
let handler = async (m, { conn }) => {
await global.loading(m, conn)
let q = m.quoted ? m.quoted : m
let mime = (q.msg || q).mimetype || ''
if (!mime) {
await global.loading(m, conn, true)
return m.reply(`🍩 *Balas pesan gambar atau video yang ingin dijadikan View Once ya sayang~*`)
}
if (!/image|video/.test(mime)) {
await global.loading(m, conn, true)
return m.reply(`🍙 *Hanya gambar atau video yang didukung untuk dikirim ulang ya~*`)
}
let media = await q.download().catch(() => null)
if (!media) {
await global.loading(m, conn, true)
return m.reply(`🍔 *Gagal mengunduh media dari pesan yang dibalas!*`)
}
if (/image/.test(mime)) {
await conn.sendMessage(m.chat, {
image: media,
caption: q.text || '',
viewOnce: true
})
} else if (/video/.test(mime)) {
await conn.sendMessage(m.chat, {
video: media,
caption: q.text || '',
viewOnce: true
})
}
await global.loading(m, conn, true)
}

handler.help = ['svo']
handler.tags = ['tools']
handler.command = /^send(view(once)?)?|svo$/i
handler.register = true
handler.premium = true

export default handler
*/