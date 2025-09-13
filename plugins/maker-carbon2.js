let handler = async (m, { conn, text, usedPrefix, command }) => { 
if (!text) return m.reply(`*🧩 Contoh: ${usedPrefix + command} console.log("hello")*`)
try {
await global.loading(m, conn)
let apiUrl = 'https://carbonara.solopov.dev/api/cook'
let res = await fetch(apiUrl, {
method: 'POST',
headers: { 'Content-Type': 'application/json' },
body: JSON.stringify({ code: text })
})
if (!res.ok) throw new Error('*🚨 API ERROR!*')
let imageBuffer = await res.arrayBuffer()
await conn.sendMessage(m.chat, {
image: Buffer.from(imageBuffer),
caption: `*✨Snapcode berhasil dibuat Sayang!*`
}, { quoted: m })
} catch (e) {
m.reply('*🥀Gagal membuat gambar code Sayang~*')
} finally {
await global.loading(m, conn, true)
}
}

handler.help = ['carbon2']
handler.command = /^(carbon2)$/i
handler.tags = ['maker']
handler.limit = true
handler.register = true

export default handler