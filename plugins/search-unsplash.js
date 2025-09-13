
import pkg from "baileys"

const { generateWAMessageFromContent, proto, prepareWAMessageMedia } = pkg

let handler = async (m, { conn, text }) => {
if (!text) return m.reply("🔍 *Masukkan kata kunci untuk mencari gambar di Unsplash!*")
try {
await global.loading(m, conn)
const apiUrl = global.API("lol", "/api/unsplash", { query: text }, "apikey")
const response = await fetch(apiUrl)
if (!response.ok) throw new Error(`API Error: ${response.status} - ${response.statusText}`)
const json = await response.json()
if (!json.result || json.result.length === 0) return m.reply("🍂 *Tidak ada hasil dari Unsplash untuk kata kunci tersebut!*")
const images = json.result.slice(0, 10)
let slides = []

for (let url of images) {
let media = await prepareWAMessageMedia({ image: { url } }, { upload: conn.waUploadToServer })
slides.push({
header: proto.Message.InteractiveMessage.Header.fromObject({
hasMediaAttachment: true,
...media
}),
body: { text: `Gambar dari Unsplash` },
nativeFlowMessage: proto.Message.InteractiveMessage.NativeFlowMessage.fromObject({
buttons: [{
name: "cta_url",
buttonParamsJson: `{\"display_text\":\"Buka Gambar\",\"url\":\"${url}\"}`
}]
})
})
}

const msg = await generateWAMessageFromContent(m.chat, {
viewOnceMessageV2Extension: {
message: {
messageContextInfo: {
deviceListMetadata: {},
deviceListMetadataVersion: 2
},
interactiveMessage: proto.Message.InteractiveMessage.fromObject({
body: { text: `🏔️ *Hasil Gambar Unsplash: ${text}*` },
carouselMessage: { cards: slides }
})
}
}}, { userJid: m.sender, quoted: m })

await conn.relayMessage(m.chat, msg.message, { messageId: msg.key.id })

} catch (e) {
console.error(e)
m.reply("❌ *Gagal mengambil data dari Unsplash. Coba lagi nanti!*")
} finally {
await global.loading(m, conn, true)
}
}

handler.help = ["unsplash"]
handler.tags = ["search"]
handler.command = /^(unsplash)$/i
handler.limit = true
handler.register = true

export default handler