let handler = async (m, { conn }) => {
let vcard = `BEGIN:VCARD
VERSION:3.0
N:Izumi;;;;
FN:Naruya Izumi
ORG:Liora Project
TEL;type=CELL;type=VOICE;waid=31629155460:+31 6 29155460
END:VCARD`

let qkontak = {
key: {
fromMe: false,
participant: "0@s.whatsapp.net",
remoteJid: "status@broadcast"
},
message: {
contactMessage: {
displayName: "𝑵𝒂𝒓𝒖𝒚𝒂 𝑰𝒛𝒖𝒎𝒊",
vcard
}
}
}

await conn.sendMessage(m.chat, {
image: { url: 'https://files.cloudkuimages.guru/images/cyZx0zkR.jpg' },
caption: '🍙 *Project Script Izumi* 🍙\n' +
'📂 *Repository: Source code resmi Liora*\n' +
'✨ *Jangan lupa kasih ⭐ di repo kalau suka ya!*',
title: '🍡 Liora — WhatsApp Bot',
subtitle: '',
footer: '*© 2024 – 2025 Naruya Izumi*\n*All Rights Reserved*',
interactiveButtons: [
{
name: 'cta_url',
buttonParamsJson: JSON.stringify({
display_text: '🌐 GitHub Repo',
url: 'https://github.com/naruyaizumi/liora',
merchant_url: 'https://github.com/naruyaizumi/liora'
})
},
{
name: 'cta_url',
buttonParamsJson: JSON.stringify({
display_text: '🐛 Report Issue',
url: 'https://github.com/naruyaizumi/liora/issues',
merchant_url: 'https://github.com/naruyaizumi/liora/issues'
})
},
{
name: 'cta_url',
buttonParamsJson: JSON.stringify({
display_text: '🔧 Pull Request',
url: 'https://github.com/naruyaizumi/liora/pulls',
merchant_url: 'https://github.com/naruyaizumi/liora/pulls'
})
}
],
hasMediaAttachment: true
}, { quoted: qkontak })
}

handler.help = ['script']
handler.tags = ['info']
handler.command = /^(script|sc)$/i

export default handler