
import sharp from 'sharp'

let handler = async (m, { conn, command, usedPrefix }) => {
let q = m.quoted ? m.quoted : m
let mime = (q.msg || q).mimetype || q.mediaType || ''
if (/image/g.test(mime) && !/webp/g.test(mime)) {
try {
let media = await q.download()
let botNumber = await conn.user.jid
let img = await pepe(media)
await conn.query({
tag: 'iq',
attrs: {
to: botNumber,
type: 'set',
xmlns: 'w:profile:picture'
},
content: [
{
tag: 'picture',
attrs: { type: 'image' },
content: img
}
]
})
m.reply(`*Sukses mengganti PP Bot*`)
} catch (e) {
console.log(e)
m.reply(`*Terjadi kesalahan, coba lagi nanti.*`)
}
} else {
m.reply(`*Kirim gambar dengan caption ${usedPrefix + command} atau tag gambar yang sudah dikirim*`)
}
}

handler.menugroup = ['setbotpp2']
handler.tagsgroup = ['owner']
handler.command = /^(set(botpp|ppbot)2)$/i
handler.mods = true
export default handler

async function pepe(media) {
let resized = await sharp(media).resize(720, 720, {
fit: 'cover'
}).jpeg().toBuffer()
return resized
}