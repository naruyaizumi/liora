import { writeOnPaper } from '../../lib/write.js'

let handler = async (m, { conn, args }) => {
try {
await global.loading(m, conn)
let teks = args.join` `
let buffer = await writeOnPaper({
imageUrl: 'https://files.cloudkuimages.guru/images/TqlDjKkC.jpg',
text: teks,
color: 'black'
})
await conn.sendFile(m.chat, buffer, 'nulis.jpg', '🍓 *Hati² ketahuan:v* 🍩', m)
} finally {
await global.loading(m, conn, true)
}
}

handler.help = ['nulis']
handler.tags = ['nulis']
handler.command = /^(nulis)$/i

export default handler