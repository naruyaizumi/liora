
import pkg from "baileys"
const { generateWAMessageFromContent, proto, prepareWAMessageMedia } = pkg

let handler = async (m, { conn, args }) => {
if (!args[0]) return m.reply("🔍 *Masukkan nama aplikasi yang ingin kamu cari di Play Store!*")
await global.loading(m, conn)
try {
let query = args.join(" ")
let res = await fetch(global.API("btz", "/api/search/playstore", { app: query }, "apikey"))
if (!res.ok) throw '❌ Gagal mengakses API Play Store.'
let json = await res.json()
let result = json.result
if (!result || !Array.isArray(result) || result.length === 0) return m.reply("❌ *Tidak ditemukan aplikasi yang cocok.*")
let cards = []
for (let item of result.slice(0, 10)) {
let media = await prepareWAMessageMedia({ image: { url: item.img } }, { upload: conn.waUploadToServer })
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
display_text: "🌐 Kunjungi Play Store",
url: item.link,
merchant_url: item.link_dev
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
text: `🔎 *Hasil Pencarian Play Store: ${query}*`
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
m.reply("❌ *Terjadi kesalahan saat mengambil data Play Store.*")
} finally {
await global.loading(m, conn, true)
}
}

handler.help = ["playstore"]
handler.tags = ["internet"]
handler.command = /^(playstore)$/i
handler.limit = true
handler.register = true

export default handler