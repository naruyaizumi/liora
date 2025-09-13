
let handler = async (m, { conn, text }) => {
if (!m.quoted) return m.reply('Reply ke pesan target.')
if (!text) return m.reply('Isi pesan tidak boleh kosong.')
let fake = conn.cMod(m.chat, m.quoted.fakeObj, text, m.quoted.sender)
await conn.relayMessage(m.chat, fake.message, { messageId: fake.key.id })
}

handler.help = ['fwdmod']
handler.tags = ['tools']
handler.command = /^(fwdmod|mod)$/i
handler.register = true

export default handler