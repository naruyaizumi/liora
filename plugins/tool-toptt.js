
import fs from 'fs'
import path from 'path'
import { tmpdir } from 'os'
import { spawn } from 'child_process'
import { promisify } from 'util'
import { randomBytes } from 'crypto'

const writeFile = promisify(fs.writeFile)
const readFile = promisify(fs.readFile)
const unlink = promisify(fs.unlink)

async function toPTT(buffer) {
let input = path.join(tmpdir(), randomBytes(6).toString('hex') + '.mp4')
let output = path.join(tmpdir(), randomBytes(6).toString('hex') + '.opus')
await writeFile(input, buffer)
await new Promise((resolve, reject) => {
let ff = spawn('ffmpeg', [
'-y',
'-i', input,
'-ss', '0',
'-vn',
'-ac', '1',
'-c:a', 'libopus',
'-b:a', '96k',
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
if (!/video|audio/.test(mime)) return m.reply('📌 *Balas video/voice note yang ingin dijadikan voice note PTT!*')
await global.loading(m, conn)
let media = await q.download()
if (!media) return m.reply('⚠️ *Gagal mengunduh media!*')
let audio = await toPTT(media)
if (!audio) return m.reply('⚠️ *Gagal mengonversi ke voice note!*')
await conn.sendMessage(m.chat, {
audio,
ptt: true,
mimetype: 'audio/ogg; codecs=opus'
}, { quoted: m })
} finally {
await global.loading(m, conn, true)
}
}

handler.help = ['topt']
handler.tags = ['audio']
handler.command = /^topt(t|tovn|tovoice)$/i
handler.limit = true
handler.register = true

export default handler