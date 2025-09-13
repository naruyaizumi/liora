
import pkg from "baileys"
const { generateWAMessageFromContent, proto, prepareWAMessageMedia } = pkg

let handler = async (m, { conn, args }) => {
if (!args[0]) return m.reply("🔍 *Masukkan nama game atau aplikasi untuk dicari di HappyMod*!")
await global.loading(m, conn)
try {
let query = args.join(" ")
let apiUrl = global.API('btz', '/api/search/happymod', { query }, 'apikey')
let res = await fetch(apiUrl)
let json = await res.json()
if (!json.status || !json.result || json.result.length === 0)
return m.reply("🫧 *Tidak ditemukan hasil apapun. Coba kata kunci lain!*")
let results = json.result.slice(0, 10)
let slides = []
for (let app of results) {
let media = await prepareWAMessageMedia({ image: { url: app.icon } }, { upload: conn.waUploadToServer })
slides.push({
header: proto.Message.InteractiveMessage.Header.fromObject({
hasMediaAttachment: true,
...media
}),
nativeFlowMessage: proto.Message.InteractiveMessage.NativeFlowMessage.fromObject({
buttons: [{
name: "cta_url",
buttonParamsJson: `{\"display_text\":\"🌐 Kunjungi Halaman\",\"url\":\"${app.link}\",\"merchant_url\":\"${app.link}\"}`
}]
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
body: { text: `🔍 *Hasil Pencarian HappyMod: ${query}*` },
carouselMessage: { cards: slides }
})
}
}
}, { userJid: m.sender, quoted: m })

await conn.relayMessage(m.chat, msg.message, { messageId: msg.key.id })
} catch (e) {
console.error(e)
m.reply("❌ *Terjadi kesalahan saat memuat hasil HappyMod.*")
} finally {
await global.loading(m, conn, true)
}
}

handler.help = ['happymod']
handler.tags = ['internet']
handler.command = /^(happymod)$/i
handler.limit = true
handler.register = true

export default handler