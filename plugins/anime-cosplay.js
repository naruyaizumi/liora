
let handler = async (m, { conn }) => {
await global.loading(m, conn)
let res = await global.API('btz', '/api/wallpaper/cosplay', { }, 'apikey')
let buffer = await (await fetch(res)).arrayBuffer()
await conn.sendFile(m.chat, buffer, 'cosplay.jpg', '*Nih Kak*', m)
await global.loading(m, conn, true)
}

handler.help = ['cosplay']
handler.tags = ['anime']
handler.command = /^(cosplay)$/i
handler.register = true
handler.limit = true

export default handler