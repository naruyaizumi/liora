
let handler = async (m, { conn }) => {
if (!m.mentionedJid || m.mentionedJid.length === 0) return m.reply('Tag pengguna yang ingin disimpan sebagai kontak.')
let kontak = []
for (let jid of m.mentionedJid) {
let number = jid.split('@')[0]
let name = await conn.getName(jid)
kontak.push([number, name])
}
return await conn.sendContact(m.chat, kontak, m)
}

handler.help = ['savekontak']
handler.tags = ['tools']
handler.command = /^(savekontak|kontak)$/i
handler.register = true

export default handler