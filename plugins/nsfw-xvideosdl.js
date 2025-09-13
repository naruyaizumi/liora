
let handler = async (m, { conn, args, usedPrefix, command }) => {
if (!args[0]) return m.reply(`🔞 *Masukkan link video dari Xvideos!*\n\n*Contoh:*\n${usedPrefix + command} https://www.xvideos.com`)
if (!args[0].includes("xvideos.com")) return m.reply("❌ *Link tidak valid!*")
await global.loading(m, conn)
try {
let url = encodeURIComponent(args[0])
let res = await fetch(`https://api.hiuraa.my.id/downloader/xvideos?url=${url}`)
let json = await res.json()
if (!json.status) return m.reply("❌ *Gagal mengambil data video!*")
let list = Object.entries(json.result.videos).map(([quality, link], i) => [
`.xviddl ${link}`,
`${i + 1}`,
`${quality.toUpperCase()}`
])
await conn.textList(m.chat, `🔞 *Pilih resolusi untuk mengunduh video Xvideos:*`, false, list, m, {
contextInfo: {
externalAdReply: {
title: "Xvideos Downloader",
body: "Klik resolusi untuk mulai unduh",
thumbnailUrl: json.result.thumb,
mediaType: 1,
renderLargerThumbnail: true,
sourceUrl: "https://instagram.com/naruyaizumi_",
}
}
})
} catch (e) {
console.error(e)
m.reply("❌ *Terjadi kesalahan saat mengambil video!*")
} finally {
await global.loading(m, conn, true)
}
}

handler.help = ["xvideosdl"]
handler.tags = ["nsfw"]
handler.command = /^(xvideosdl)$/i
handler.nsfw = true
handler.premium = true
handler.age = 18
handler.register = true

export default handler