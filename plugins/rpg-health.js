
let handler = async (m, { conn }) => {
let user = global.db.data.users[m.sender]
let maxHealth = 100 + user.level * 10
let health = user.health
let caption = `
${bar(health, maxHealth)}
❤️ *${health} / ${maxHealth}*
`.trim()
m.reply(caption)
}

handler.help = ['health']
handler.tags = ['rpg']
handler.command = /^(health|darah)$/i
handler.register = true
handler.group = true
handler.rpg = true

export default handler

function bar(current, max) {
let length = 15
let filledBars = Math.round(current / max * length)
let emptyBars = length - filledBars
return `❤️ ${"█".repeat(filledBars)}${"░".repeat(emptyBars)}`
}