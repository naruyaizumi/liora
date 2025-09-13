
import { format } from 'util'
import { spawn } from 'child_process'

let fontPath = 'src/font/Zahraaa.ttf'
let handler = async (m, { conn, args }) => {
try {
await global.loading(m, conn)
let inputPath = 'src/kertas/magernulis1.jpg'
let d = new Date
let tgl = d.toLocaleDateString('id-Id')
let hari = d.toLocaleDateString('id-Id', { weekday: 'long' })
let teks = args.join` `.replace(/(.{1,43})(\s|$)/g, '$1\n')
let bufs = []
const _spawnprocess = 'convert'
const _spawnargs = [
inputPath,
'-font', fontPath,
'-fill', 'blue',
'-size', '1024x784',
'-pointsize', '20',
'-interline-spacing', '1',
'-annotate', '+806+78', hari,
'-font', fontPath,
'-fill', 'blue',
'-size', '1024x784',
'-pointsize', '18',
'-interline-spacing', '1',
'-annotate', '+806+102', tgl,
'-font', fontPath,
'-fill', 'blue',
'-size', '1024x784',
'-pointsize', '20',
'-interline-spacing', '-7.5',
'-annotate', '+344+142', teks,
'jpg:-'
]
spawn(_spawnprocess, _spawnargs)
.on('error', e => m.reply(format(e)))
.on('close', async () => {
await conn.sendFile(m.chat, Buffer.concat(bufs), 'nulis.jpg', '*Hati² ketahuan:v*', m)
})
.stdout.on('data', chunk => bufs.push(chunk))
} finally {
await global.loading(m, conn, true)
}
}

handler.help = ['nulis2']
handler.tags = ['nulis']
handler.command = /^(nulis2)$/i
handler.register = true

export default handler