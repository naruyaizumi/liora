
let handler = async (m) => {
let res = await fetch('https://raw.githubusercontent.com/IdkJhus/JhuszBotV1/main/node_modules/ra-api/lib/database/pantun.json')
let data = await res.json()
let pantun = data[Math.floor(Math.random() * data.length)]
m.reply(`🍓 ${pantun.trim()}`)
}

handler.help = ['pantun']
handler.tags = ['quotes']
handler.command = /^(pantun)$/i
handler.register = true
handler.limit = true

export default handler