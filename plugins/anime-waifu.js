
let handler = async (m, { conn, usedPrefix }) => {
try {
await global.loading(m, conn)
let res = await fetch('https://api.waifu.pics/sfw/waifu')
if (!res.ok) throw await res.text()
let json = await res.json()
conn.sendFile(m.chat, json.url, 'waifu.jpeg', '*Nih Waifunya Kak...*', m, false)
} catch (e) {
throw e
} finally {
await global.loading(m, conn, true)
}
}
handler.help = ['awaifu']
handler.tags = ['anime']
handler.command = /^(awaifu)$/i
handler.limit = true
handler.register = true
export default handler