
let bpink = []
fetch('https://raw.githubusercontent.com/arivpn/dbase/master/kpop/blekping.txt')
.then(res => res.text())
.then(txt => bpink = txt.split('\n'))
let handler = async (m, { conn }) => {
let img = bpink[Math.floor(Math.random() * bpink.length)]
if (!img) throw img
await conn.sendFile(m.chat, img, '', '🎀 *Nih Kak Bˡᵃᶜᵏᵖⁱⁿᵏ Nya~* 🌸', m, 0, { thumbnail: await (await fetch(img)).buffer() })
}

handler.help = ['blackpink']
handler.tags = ['random']
handler.command = /^(blackpink)$/i
handler.limit = true
handler.register = true

export default handler