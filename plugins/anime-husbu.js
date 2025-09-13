
let handler = async (m, { conn, command }) => {
try {
await global.loading(m, conn)
let url = API('lol', '/api/random/husbu', null, 'apikey')
conn.sendFile(m.chat, url, 'husbu.jpeg', '*Nih kak*', m)
} catch (e) {
throw e
} finally {
await global.loading(m, conn, true)
}
}
handler.command = /^(husbu)$/i
handler.tags = ['anime']
handler.help = ['husbu']
handler.limit = true
handler.register = true

export default handler