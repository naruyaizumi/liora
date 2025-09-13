
const winScore = 1000

let handler = async (m, { conn, usedPrefix }) => {
conn.family = conn.family ? conn.family : {}
let id = m.chat
if (id in conn.family)
return conn.reply(m.chat, '🍮 *Masih ada kuis yang belum terjawab di chat ini!*', conn.family[id].msg)
let res = await fetch('https://raw.githubusercontent.com/naruyaizumi/json/main/family100.json')
if (!res.ok) throw await res.text()
let src = await res.json()
let json = src[Math.floor(Math.random() * src.length)]
let caption = `
🍭 *Family 100!*
📖 *Soal: ${json.soal}*
🍡 *Jumlah Jawaban: ${json.jawaban.length} jawaban*${json.jawaban.some(v => v.includes(' ')) ? `\n🍬 *Note: Beberapa jawaban mengandung spasi*` : ''}
🎁 *Bonus: +${winScore} XP per jawaban benar*
`.trim()
conn.family[id] = {
id,
msg: await m.reply(caption),
...json,
terjawab: Array.from(json.jawaban, () => false),
winScore,
}
}

handler.help = ['family100']
handler.tags = ['game']
handler.command = /^family100$/i
handler.onlyprem = true
handler.game = true
handler.register = true

export default handler