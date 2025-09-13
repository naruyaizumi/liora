
import { evaluate, format, sqrt, log10, log, sin, cos, tan, pi } from 'mathjs'

const timeout = 60000

let handler = async (m, { conn, args, usedPrefix, command }) => {
conn.math = conn.math || {}
let id = m.chat
if (args.length < 1) return conn.reply(m.chat, `
*Contoh penggunaan:*
${usedPrefix + command} noob

*Mode tersedia:*
${Object.keys(modes).join(' | ')}
`.trim(), m)

let mode = args[0].toLowerCase()
if (!(mode in modes)) return conn.reply(m.chat, `Mode *${mode}* tidak tersedia!`, m)
if (id in conn.math) return conn.reply(m.chat, '⚠️ *Masih ada soal belum terjawab di sini!*', conn.math[id][0])

let math = genMath(mode)
let caption = `
🧠 *Soal Matematika (${mode.toUpperCase()})*
Berapa hasil dari: *${math.expr}*?

⏱️ Timeout: ${(timeout / 1000).toFixed(0)} detik
🎁 Bonus: *${math.bonus} XP*
`.trim()

conn.math[id] = [
await conn.reply(m.chat, caption, m),
math,
4,
setTimeout(() => {
if (conn.math[id]) {
conn.reply(m.chat, `⏰ *Waktu habis!*\n✅ Jawaban: *${math.result}*`, conn.math[id][0])
delete conn.math[id]
}
}, timeout)
]
}

handler.help = ['math <mode>']
handler.tags = ['game']
handler.command = /^math$/i
handler.register = true
handler.game = true
export default handler

const modes = {
noob:     { ops: ['+', '-', '*', '/'], range: [-10, 10], bonus: 10 },
easy:     { ops: ['+', '-', '*', '/'], range: [-50, 50], bonus: 30 },
medium:   { ops: ['+', '-', '*', '/', 'sqrt', 'log10'], range: [1, 100], bonus: 100 },
hard:     { ops: ['+', '-', '*', '/', 'sqrt', 'log10', 'log', '^'], range: [1, 500], bonus: 300 },
extreme:  { ops: ['+', '-', '*', '/', 'sqrt', 'log10', 'log', 'sin', 'cos', 'tan', '^'], range: [1, 1000], bonus: 1000 },
impossible: { ops: ['+', '-', '*', '/', 'sqrt', 'log10', 'log', 'sin', 'cos', 'tan', '^'], range: [1, 99999], bonus: 3000 },
}

function genMath(mode) {
let { ops, range, bonus } = modes[mode]
let a = randFloat(range[0], range[1])
let b = randFloat(range[0], range[1])
let op = pickRandom(ops)
let expr, result

switch (op) {
case '+': expr = `${a} + ${b}`; result = a + b; break
case '-': expr = `${a} - ${b}`; result = a - b; break
case '*': expr = `${a} × ${b}`; result = a * b; break
case '/': b = b == 0 ? 1 : b; expr = `${a} ÷ ${b}`; result = a / b; break
case '^': expr = `${a} ^ ${b}`; result = a ** b; break
case 'sqrt': expr = `√${Math.abs(a)}`; result = sqrt(Math.abs(a)); break
case 'log10': expr = `log₁₀(${Math.abs(a)})`; result = log10(Math.abs(a)); break
case 'log': expr = `ln(${Math.abs(a)})`; result = log(Math.abs(a)); break
case 'sin': expr = `sin(${a.toFixed(0)}°)`; result = sin(a * Math.PI / 180); break
case 'cos': expr = `cos(${a.toFixed(0)}°)`; result = cos(a * Math.PI / 180); break
case 'tan': expr = `tan(${a.toFixed(0)}°)`; result = tan(a * Math.PI / 180); break
default: expr = `${a} + ${b}`; result = a + b
}

return {
expr: format(expr),
result: Number(result.toFixed(4)),
bonus
}
}

function pickRandom(arr) {
return arr[Math.floor(Math.random() * arr.length)]
}

function randFloat(min, max) {
return parseFloat((Math.random() * (max - min) + min).toFixed(2))
}