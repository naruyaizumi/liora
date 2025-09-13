
let handler = async (m, { conn }) => {
if (!m.mentionedJid?.includes('6283143663697@s.whatsapp.net')) return
const izumi = '6283143663697@s.whatsapp.net'
const text = (m.text || "").replace(new RegExp(`@${izumi.split("@")[0]}`, "g"), "").trim()
await conn.sendMessage(m.chat, {
text: '🌷 *Eh, nyari Izumi ya?* 🌷\n\n🌟 *Jangan ragu buat chat dia, ya!*\n*Aku yakin Izumi bakal senang banget bisa bantu kamu Yuk, kirim pesan sekarang~* 🌼',
footer: '© Naruya Izumi 2024',
title: 'CHAT',
subtitle: '',
interactiveButtons: [
{
name: 'cta_url',
buttonParamsJson: JSON.stringify({
display_text: 'CHAT',
url: 'https://api.whatsapp.com/send?phone=6283143663697',
merchant_url: 'https://api.whatsapp.com/send?phone=6283143663697'
})
}
],
}, { quoted: m })
}

handler.customPrefix = /^@(\d+|[^\s@]+)\b/i
handler.command = new RegExp()

export default handler