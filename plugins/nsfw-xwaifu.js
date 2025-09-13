
let handler = async (m, { conn, usedPrefix, command }) => {

m.reply(wait)
let res = await fetch('https://api.waifu.pics/nsfw/waifu')

if (!res.ok) return m.react('❌')

let json = await res.json()

if (!json.url) return m.react('❌')

await conn.sendFile(m.chat, json.url, 'xwaifu.png', '*RANDOM WAIFU*', m)


}
handler.help = ['xwaifu']
handler.tags = ['nsfw']
handler.command = ['xwaifu']
handler.premium = true
handler.register = true
handler.nsfw = true
export default handler