let handler = async (m, { conn, isMods }) => {
if (!m.isGroup) return
if (!m.mentionedJid?.length) return
if (isMods) {
await conn.sendMessage(m.chat, {
text: `🌷 *Eh, nyari Developer ya?* 🌷
🌟 *Itu yang di-mention developer langsung tuh~* 🍡`,
footer: '© Naruya Izumi 2024',
title: '🍡 Mention Developer',
subtitle: '',
interactiveButtons: [
{
name: 'cta_url',
buttonParamsJson: JSON.stringify({
display_text: 'CHAT',
url: 'https://api.whatsapp.com/send?phone=' + m.sender.split('@')[0],
merchant_url: 'https://api.whatsapp.com/send?phone=' + m.sender.split('@')[0]
})
}
]
}, { quoted: m })
}
}

handler.customPrefix = /^@(\d+|[^\s@]+)\b/i
handler.command = new RegExp()

export default handler