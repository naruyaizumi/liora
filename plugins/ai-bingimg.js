import pkg from "baileys"

const { generateWAMessageFromContent, proto, prepareWAMessageMedia } = pkg

let handler = async (m, { conn, text }) => {
if (!text) return m.reply("🔍 *Masukkan kata kunci untuk mencari gambar di Bing!*")
try {
await global.loading(m, conn)
const apiUrl = global.API("btz", "/api/search/bing-img", { text }, "apikey")
const response = await fetch(apiUrl)
if (!response.ok) throw new Error(`API Error: ${response.status} - ${response.statusText}`)
const json = await response.json()
if (!json.result || json.result.length === 0) return m.reply("🍂 *Tidak ada hasil untuk kata kunci tersebut!*")
const images = json.result.slice(0, 10)
let slides = []
for (let imgUrl of images) {
let imgsc = await prepareWAMessageMedia({ image: { url: imgUrl }}, { upload: conn.waUploadToServer })
slides.push({
header: proto.Message.InteractiveMessage.Header.fromObject({
hasMediaAttachment: true,
...imgsc
}),
nativeFlowMessage: proto.Message.InteractiveMessage.NativeFlowMessage.fromObject({
buttons: [{
name: "cta_url",
buttonParamsJson: JSON.stringify({
display_text: "Link Gambar",
url: imgUrl,
merchant_url: "https://www.bing.com"
})
}]
})
})
}
const msgii = await generateWAMessageFromContent(m.chat, {
viewOnceMessageV2Extension: {
message: {
messageContextInfo: {
deviceListMetadata: {},
deviceListMetadataVersion: 2
},
interactiveMessage: proto.Message.InteractiveMessage.fromObject({
body: proto.Message.InteractiveMessage.Body.fromObject({
text: `🔎 *Hasil Pencarian Bing: ${text}*`
}),
carouselMessage: proto.Message.InteractiveMessage.CarouselMessage.fromObject({
cards: slides
})
})
}
}}, { userJid: m.sender, quoted: m })
await conn.relayMessage(m.chat, msgii.message, { messageId: msgii.key.id })
} catch (error) {
console.error(error)
m.reply("🍂 *Terjadi kesalahan saat mengambil data dari Bing Image. Coba lagi nanti!*")
} finally {
await global.loading(m, conn, true)
}
}

handler.help = ["bingimg"]
handler.tags = ["ai"]
handler.command = /^(bingimg|bingimage)$/i
handler.limit = true
handler.register = true

export default handler