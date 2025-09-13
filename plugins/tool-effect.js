
import { audioEffect } from '../lib/convert.js'

let handler = async (m, { conn, usedPrefix, command }) => {
try {
await audioEffect(m, conn, command)
} catch (e) {
console.error(e)
m.reply(e.message || '❌ *Gagal memproses audio.*')
} finally {
await global.loading(m, conn, true)
}
}

handler.help = ['bass', 'blown', 'deep', 'earrape', 'fast', 'fat', 'nightcore', 'reverse', 'robot', 'slow', 'smooth', 'tupai', 'audio8d', 'echo', 'distortion', 'pitch', 'reverb', 'flanger', 'apulsator', 'tremolo', 'chorus']
handler.tags = ['audio']
handler.command = /^(bass|blown|deep|earrape|fast|fat|nightcore|reverse|robot|slow|smooth|tupai|audio8d|echo|distortion|pitch|reverb|flanger|apulsator|tremolo|chorus)$/i
handler.limit = true
handler.register = true

export default handler