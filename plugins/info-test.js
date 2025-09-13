
let handler = async (m, { conn }) => {
const startTime = performance.now()
const endTime = performance.now()
let responseTime = (endTime - startTime).toFixed(2)
await conn.sendMessage(m.chat, {
text: `📡 *Crystalia Online*
🕒 *Waktu respon: ${responseTime} ms*

*Kalau nemu bug atau error, langsung kabarin Owner Izumi ya kak. Makasih udah coba!*`
}, { quoted: m })
}

handler.help = ['test']
handler.tags = ['info']
handler.command = /^(test)$/i

export default handler