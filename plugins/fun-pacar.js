let handler = async (m, { conn, usedPrefix, command, text }) => {
let user = global.db.data.users
if (user[m.sender].pacar == "") return m.reply(`💔 *Kamu belum punya pacar nih...*\n*Yang sabar ya sayang~ jodoh pasti datang kok~*`)
let date = await dateTime(user[m.sender].pacaranTime)
let pacar = `@${user[m.sender].pacar.split("@")[0]}`
let caption = `
*🌸 𝗣𝗔𝗦𝗔𝗡𝗚𝗔𝗡 𝗞𝗔𝗠𝗨 🌸*
━━━━━━━━━━━━━━━━
💞 *Nama Pasangan: ${pacar}*
📆 *Sejak Jadian: ${date}*
━━━━━━━━━━━━━━━━
💌 *Semoga hubungan kalian langgeng dan selalu manis ya~*
🌷 *Jangan lupa kasih peluk atau cium ke pacarmu tiap hari!* 
`.trim()
await conn.sendMessage(m.chat, {
text: caption
}, { quoted: m })
}

handler.help = ['pacar']
handler.tags = ['fun']
handler.command = /^(pacar)$/i
handler.register = true
handler.group = true

export default handler

function dateTime(timestamp) {
const dateReg = new Date(timestamp)
const options = { year: 'numeric', month: 'long', day: 'numeric' }
return dateReg.toLocaleDateString('id-ID', options)
}