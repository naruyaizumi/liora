let handler = async (m, { conn, args }) => {
let text = args[0]
if (!text) return m.reply('🍰 *Masukkan link grup atau saluran WhatsApp dulu ya~*')
let url
try {
url = new URL(text)
} catch {
return m.reply('🍰 *Masukkan link grup atau saluran WhatsApp yang valid ya~*')
}

let isGroup = (url.hostname === "chat.whatsapp.com") && url.pathname.match(/^\/[A-Za-z0-9]{20,}$/)
let isChannel = (url.hostname === "whatsapp.com") && url.pathname.startsWith("/channel/")
let id, name, code
try {
if (isGroup) {
code = url.pathname.replace(/^\/+/, '')
let res = await conn.groupGetInviteInfo(code)
id = res.id
name = res.subject
} else if (isChannel) {
code = url.pathname.split('/channel/')[1]?.split('/')[0]
let res = await conn.newsletterMetadata('invite', code, 'GUEST')
id = res.id
name = res.name
} else return m.reply("🍩 *Link tidak valid. Masukkan link grup atau saluran WhatsApp ya~*")
} catch (err) {
console.error(err)
return m.reply("🧁 *Maaf, gagal mengambil data dari link itu...*")
}
await conn.sendMessage(m.chat, {
text: `🍬 *Informasi Ditemukan!*\n🍡 *Nama: ${name}*\n🍭 *ID: ${id}*`,
footer: '',
title: '🍧 CEK ID',
interactiveButtons: [
{
name: 'cta_copy',
buttonParamsJson: JSON.stringify({
display_text: '📋 Salin ID',
copy_code: id
})
}
]
}, { quoted: m })
}

handler.help = ['cekid']
handler.tags = ['tool']
handler.command = /^(cekid|id)$/i

export default handler