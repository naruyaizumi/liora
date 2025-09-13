
import pkg from "baileys"
const { generateWAMessageFromContent, proto, prepareWAMessageMedia } = pkg

let handler = async (m, { conn, args }) => {
if (!args[0]) return m.reply("🔍 *Masukkan nama aplikasi untuk dicari di APKCombo!*")
await global.loading(m, conn)
try {
let query = args.join(" ")
let res = await fetch(`https://api.hiuraa.my.id/search/apkcombo?q=${encodeURIComponent(query)}`)
if (!res.ok) throw new Error("Gagal mengambil data APKCombo.")
let json = await res.json()
if (!json.status || !json.result || json.result.length === 0) return m.reply("❌ *Tidak ada hasil ditemukan.*")
let cards = []
for (let item of json.result.slice(0, 10)) {
let media = await prepareWAMessageMedia({ image: { url: "https://apkcombo.com/static/images/icon.png" } }, { upload: conn.waUploadToServer })
cards.push({
header: proto.Message.InteractiveMessage.Header.fromObject({
hasMediaAttachment: true,
...media
}),
nativeFlowMessage: proto.Message.InteractiveMessage.NativeFlowMessage.fromObject({
buttons: [
{
name: "cta_url",
buttonParamsJson: JSON.stringify({
display_text: "🌐 Unduh APK",
url: item.link,
merchant_url: item.link
})
}
]
})
})
}
let msg = await generateWAMessageFromContent(m.chat, {
viewOnceMessageV2Extension: {
message: {
messageContextInfo: {
deviceListMetadata: {},
deviceListMetadataVersion: 2
},
interactiveMessage: proto.Message.InteractiveMessage.fromObject({
body: proto.Message.InteractiveMessage.Body.fromObject({
text: `📦 *Hasil Pencarian APKCombo: ${query}*`
}),
carouselMessage: proto.Message.InteractiveMessage.CarouselMessage.fromObject({
cards
})
})
}
}
}, { userJid: m.sender, quoted: m })

await conn.relayMessage(m.chat, msg.message, { messageId: msg.key.id })
} catch (e) {
console.error(e)
m.reply("❌ *Terjadi kesalahan saat mengambil data APKCombo.*")
} finally {
await global.loading(m, conn, true)
}
}

handler.help = ["apkcombo"]
handler.tags = ["internet"]
handler.command = /^(apkcombo)$/i
handler.limit = true
handler.register = true

export default handler