import { convert } from '../../lib/convert.js'

let handler = async (m, { conn }) => {
try {
let q = m.quoted || m
let mime = (q.msg || q).mimetype || ''
if (!/video|audio/.test(mime)) return m.reply('🍙 *Balas video atau voice note yang ingin dikonversi ke MP3!*')
await global.loading(m, conn)
let media = await q.download()
if (!media) return m.reply('🍔 *Gagal mengunduh media!*')
let audio = await convert(media)
if (!audio) return m.reply('🍡 *Konversi gagal!*')
await conn.sendFile(m.chat, audio, "audio.mp3", "", m, false, { mimetype: "audio/mpeg" })
} finally {
await global.loading(m, conn, true)
}
}

handler.help = ['tomp3']
handler.tags = ['audio']
handler.command = /^(tomp3|toaudio)$/i

export default handler