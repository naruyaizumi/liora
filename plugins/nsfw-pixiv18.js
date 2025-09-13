
import pkg from "baileys"
const { generateWAMessageFromContent, proto, prepareWAMessageMedia } = pkg

let handler = async (m, { conn, text }) => {
if (!text) return m.reply("🔍 *Masukkan kata kunci untuk mencari gambar NSFW dari Pixiv!*")
try {
await global.loading(m, conn)
let res = await fetch(`https://api.hiuraa.my.id/search/pixivr18?q=${encodeURIComponent(text)}`)
let json = await res.json()
if (!json.result || json.result.length === 0) return m.reply("❌ *Tidak ditemukan hasil NSFW untuk kata kunci tersebut!*")
let results = json.result.slice(0, 10)
let slides = []
for (let item of results) {
let img = await prepareWAMessageMedia({ image: { url: item.imageUrl } }, { upload: conn.waUploadToServer })
slides.push({
header: proto.Message.InteractiveMessage.Header.fromObject({
hasMediaAttachment: true,
...img
}),
nativeFlowMessage: proto.Message.InteractiveMessage.NativeFlowMessage.fromObject({
buttons: [{
name: "cta_url",
buttonParamsJson: `{\"display_text\":\"🎨 ${item.author} | ${item.type}\",\"url\":\"${item.imageUrl}\",\"merchant_url\":\"${item.imageUrl}\"}`
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
body: { text: `🔞 *Hasil NSFW Pixiv: ${text}*` },
carouselMessage: { cards: slides }
})
}
}
}, { userJid: m.sender, quoted: m })
await conn.relayMessage(m.chat, msg.message, { messageId: msg.key.id })
} catch (e) {
console.error(e)
m.reply("🥀 *Terjadi kesalahan saat memuat konten NSFW Pixiv.*")
} finally {
await global.loading(m, conn, true)
}
}

handler.help = ["pixiv18"]
handler.tags = ["nsfw"]
handler.command = /^(pixiv18)$/i
handler.register = true
handler.premium = true
handler.nsfw = true
handler.age = 18

export default handler