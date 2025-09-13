
import fs from 'fs'
import path from 'path'
import { tmpdir } from 'os'
import { spawn } from 'child_process'
import { promisify } from 'util'
import { randomBytes } from 'crypto'

const writeFile = promisify(fs.writeFile)
const readFile = promisify(fs.readFile)
const unlink = promisify(fs.unlink)

async function toAudio(buffer) {
let input = path.join(tmpdir(), randomBytes(6).toString('hex') + '.mp4')
let output = path.join(tmpdir(), randomBytes(6).toString('hex') + '.mp3')
await writeFile(input, buffer)
await new Promise((resolve, reject) => {
let ff = spawn('ffmpeg', [
'-y',
'-i', input,
'-ss', '0',
'-vn',
'-ar', '44100',
'-acodec', 'libmp3lame',
'-b:a', '128k',
'-compression_level', '0',
'-write_xing', '0',
output
])
ff.on('close', code => code === 0 ? resolve() : reject(new Error('ffmpeg exited with ' + code)))
ff.on('error', reject)
})
let audio = await readFile(output)
await unlink(input)
await unlink(output)
return audio
}

let handler = async (m, { conn }) => {
try {
let q = m.quoted || m
let mime = (q.msg || q).mimetype || ''
if (!/video|audio/.test(mime)) return m.reply('📌 *Balas video atau voice note yang ingin dikonversi ke MP3!*')
await global.loading(m, conn)
let media = await q.download()
if (!media) return m.reply('⚠️ *Gagal mengunduh media!*')
let audio = await toAudio(media)
if (!audio) return m.reply('⚠️ *Konversi gagal!*')
await conn.sendMessage(m.chat, {
audio,
mimetype: 'audio/mpeg'
}, { quoted: m })
} finally {
await global.loading(m, conn, true)
}
}

handler.help = ['tomp3']
handler.tags = ['audio']
handler.command = /^(tomp3|toaudio)$/i
handler.limit = true
handler.register = true

export default handler