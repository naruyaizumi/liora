
let arr = []
fetch('https://raw.githubusercontent.com/arivpn/dbase/master/kpop/exo.txt')
.then(res => res.text())
.then(txt => arr = txt.split('\n'))
let handler = async (m, { conn }) => {
let img = arr[Math.floor(Math.random() * arr.length)]
if (!img) throw img
await conn.sendFile(m.chat, img, '', '🎤 *Nih Kak Eˣᵒ Nyaaa~* 🩵', m, 0, { thumbnail: await (await fetch(img)).buffer() })
}

handler.help = ['exo']
handler.tags = ['random']
handler.command = /^exo$/i
handler.limit = true
handler.register = true

export default handler