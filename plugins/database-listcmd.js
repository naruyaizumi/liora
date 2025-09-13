
let handler = async (m, { conn, usedPrefix }) => {
let sticker = global.db.data.users[m.sender].sticker
if (!sticker || Object.keys(sticker).length === 0)
return m.reply(`🍰 *Belum ada stiker dengan perintah tersimpan.*\n*Coba gunakan ${usedPrefix}setcmd dulu ya~*`)
conn.reply(m.chat, `
🍬 *DAFTAR PERINTAH STICKER KAMU* 🍬

\`\`\`
${Object.entries(sticker).map(([key, value], index) =>
`🍡 *${index + 1}. ${value.locked ? `(🔒 Terkunci)` : '🔓'} ${key} : ${value.text}*`).join('\n')}
\`\`\`

🍩 *Total: ${Object.keys(sticker).length} stiker*
`.trim(), m, {
mentions: Object.values(sticker).map(x => x.mentionedJid || []).flat()
})
}

handler.help = ['listcmd']
handler.tags = ['database']
handler.command = /^(listcmd)$/i
handler.register = true

export default handler