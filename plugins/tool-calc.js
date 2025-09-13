
import { evaluate } from 'mathjs'

let handler = async (m, { text }) => {
let id = m.chat
conn.math = conn.math ? conn.math : {}
if (id in conn.math) {
clearTimeout(conn.math[id][3])
delete conn.math[id]
return m.reply('Hmmm... ngecheat?')
}
let val = text
.replace(/[^0-9\-\/+*×÷πEe()^piPI]/g, '')
.replace(/×/g, '*')
.replace(/÷/g, '/')
.replace(/π|pi/gi, 'pi')
.replace(/e/gi, 'e')
let format = val
.replace(/pi/g, 'π')
.replace(/e/g, 'e')
.replace(/\//g, '÷')
.replace(/\*/g, '×')
try {
let result = evaluate(val)
if (!result) return m.reply(result)
m.reply(`📐 *Hasil perhitungan:*\n\n*${format} = ${result}*`)
} catch (e) {
m.reply('❌ Format salah! Gunakan angka dan simbol -, +, *, /, ×, ÷, π, e, (, )')
}
}

handler.help = ['calculator']
handler.tags = ['tools']
handler.command = /^(c|calc(ulat(e|or))?|kalk(ulator)?)$/i
handler.limit = true
handler.register = true

export default handler