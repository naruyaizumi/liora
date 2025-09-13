
let handler = async (m, { conn, command }) => {
try {
await global.loading(m, conn)
let url = API('lol', '/api/random/art', null, 'apikey')
conn.sendFile(m.chat, url, 'fanart.jpeg', '*Nih kak*', m, false)
} catch (e) {
throw e
} finally {
await global.loading(m, conn, true)
}
}
handler.command = /^(fanart)$/i
handler.tags = ['anime']
handler.help = ['fanart']
handler.premium = false
handler.limit = true
handler.register = true

export default handler