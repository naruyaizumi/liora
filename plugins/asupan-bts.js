
let bts = []
fetch('https://raw.githubusercontent.com/arivpn/dbase/master/kpop/batues.txt')
.then(res => res.text())
.then(txt => bts = txt.split('\n'))

let handler = async (m, { conn }) => {
let img = bts[Math.floor(Math.random() * bts.length)]
if (!img) throw img
await conn.sendFile(m.chat, img, '', '🎤 *Nih Kak Bᵗˢ Nyaaa~* 🌸', m, 0, { thumbnail: await (await fetch(img)).buffer() })
}

handler.help = ['bts']
handler.tags = ['random']
handler.command = /^(bts)$/i
handler.limit = true
handler.register = true

export default handler