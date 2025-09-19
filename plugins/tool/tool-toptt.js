import { convert } from '../../lib/convert.js'

let handler = async (m, { conn }) => {
try {
let q = m.quoted || m
let mime = (q.msg || q).mimetype || ''
if (!/^(video|audio)\//.test(mime)) return m.reply('🍙 *Balas video atau voice note yang ingin dikonversi ke MP3!*')
await global.loading(m, conn)
let media = await q.download()
if (!media) return m.reply('🍔 *Gagal mengunduh media!*')
let audio = await convert(media, mime.split('/')[1])
if (/^video\//.test(mime)) {
audio = await convert(audio, 'mp3')
}
if (!audio) return m.reply('🍡 *Konversi gagal!*')
await conn.sendMessage(m.chat, {
audio,
ptt: true,
mimetype: 'audio/ogg; codecs=opus'
}, { quoted: m })
} finally {
await global.loading(m, conn, true)
}
}

handler.help = ['toptt']
handler.tags = ['tool']
handler.command = /^(topt(t|tovn|tovoice))$/i

export default handler