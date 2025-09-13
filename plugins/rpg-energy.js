
let handler = async (m, { conn }) => {
let user = global.db.data.users[m.sender]
let maxEnergy = 50 + user.level * 5
let energy = user.energy
let caption = `
${bar(energy, maxEnergy)}
⚡ *${energy} / ${maxEnergy}*
`.trim()
m.reply(caption)
}

handler.help = ['energy']
handler.tags = ['rpg']
handler.command = /^(energy|energi)$/i
handler.register = true
handler.group = true
handler.rpg = true

export default handler

function bar(current, max) {
let length = 15
let filledBars = Math.round(current / max * length)
let emptyBars = length - filledBars
return `⚡ ${"█".repeat(filledBars)}${"░".repeat(emptyBars)}`
}