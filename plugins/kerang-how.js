let handler = async (m, { conn, command, text, usedPrefix, participants }) => {
if (!text) return conn.sendMessage(m.chat, { text: `📌 *Contoh: ${usedPrefix + command} @628xxx atau nama apa aja*`, mentions: [m.sender] }, { quoted: m })
let mention = m.mentionedJid && m.mentionedJid.length > 0 ? m.mentionedJid[0] : m.sender
let name = mention === m.sender ? text : (await conn.getName(mention)).split(' ')[0]
let percent = Math.floor(Math.random() * 101)
let cmd = command.toLowerCase()
let type = ''
if (cmd.includes('howgay')) type = 'GAY'
else if (cmd.includes('howpintar')) type = 'PINTAR'
else if (cmd.includes('howcantik')) type = 'CANTIK'
else if (cmd.includes('howganteng')) type = 'GANTENG'
else if (cmd.includes('howgabut')) type = 'GABUT'
else if (cmd.includes('howgila')) type = 'GILA'
else if (cmd.includes('howlesbi')) type = 'LESBI'
else if (cmd.includes('howstress')) type = 'STRESS'
else if (cmd.includes('howbucin')) type = 'BUCIN'
else if (cmd.includes('howjones')) type = 'JONES'
else if (cmd.includes('howsadboy')) type = 'SADBOY'
else return conn.sendMessage(m.chat, { text: `❌ Command tidak dikenal.`, mentions: [m.sender] }, { quoted: m })
let caption = `
🍽️ *Pertanyaan: ${command} ${text}*
🍱 *Jawaban: ${name} itu ${percent}% ${type}*
`.trim()
await conn.sendMessage(m.chat, { text: caption, mentions: [mention] }, { quoted: m })
}

handler.help = ['howgay', 'howpintar', 'howcantik', 'howganteng', 'howgabut', 'howgila', 'howlesbi', 'howstress', 'howbucin', 'howjones', 'howsadboy']
handler.tags = ['kerang']
handler.command = /^how(gay|pintar|cantik|ganteng|gabut|gila|lesbi|stress?|bucin|jones|sadboy)$/i
handler.register = true

export default handler