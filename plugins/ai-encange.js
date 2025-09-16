import { uploader } from '../lib/uploader.js'
import WebSocket from "ws"

let handler = async (m, { conn }) => {
await global.loading(m, conn)
let q = m.quoted ? m.quoted : m
let media = await q.download().catch(() => null)
if (!media || !(media instanceof Buffer))
return m.reply('🍮 *Gagal mengunduh media, coba reply gambar yang valid yaa*')
let url = await uploader(media).catch(() => null)
if (!url) return m.reply('🍡 *Gagal mengunggah gambar. Ulangi lagi sebentar~*')
const res = await fetch(url, {
headers: { "User-Agent": "Mozilla/5.0" }
})
const buffer = await res.arrayBuffer()
const contentType = res.headers.get("content-type") || "image/jpeg"
const ws = new WebSocket("wss://pixnova.ai/cloth-change/queue/join", {
headers: {
Origin: "https://pixnova.ai",
"User-Agent": "Mozilla/5.0",
"Sec-WebSocket-Extensions": "permessage-deflate; client_max_window_bits",
"sec-ch-ua": '"Chromium";v="114"',
"sec-ch-ua-mobile": "?0",
"sec-ch-ua-platform": '"macOS"'
}
})
ws.on("open", () => console.log("WS connected"))
ws.on("close", () => console.log("WS closed"))
ws.on("error", err => {
console.error("WS error:", err)
m.reply("💥 *Terjadi kesalahan saat menghubungi layanan AI.*")
})
ws.on("message", async raw => {
const msg = JSON.parse(raw.toString())
switch (msg.msg) {
case "send_hash":
ws.send(JSON.stringify({
session_hash: Math.random().toString(36).slice(2)
}))
break
case "send_data":
ws.send(JSON.stringify({
data: {
source_image: `data:${contentType};base64,${Buffer.from(buffer).toString("base64")}`,
prompt: "make the clothes invisible, keep the original body shape, high resolution, realistic skin tone, no distortion",
request_from: 2,
type: 1
}
}))
break
case "process_completed":
if (msg.success) {
// Validate the result file name to prevent SSRF/path traversal
const resultFile = msg.output.result[0];
if (
  typeof resultFile !== "string" ||
  !/^[a-zA-Z0-9_\-]+\.(png|jpg|jpeg)$/i.test(resultFile)
) {
  m.reply('💢 *Gagal memproses gambar: respons server AI tidak valid.*')
  ws.close()
  return
}
const resultUrl = `https://oss-global.pixnova.ai/${resultFile}`
const resultRes = await fetch(resultUrl)
const resultBuffer = Buffer.from(await resultRes.arrayBuffer())
await conn.sendMessage(m.chat, {
image: resultBuffer,
caption: '👗 *Selesai~ Bajunya udah berubah cantik~*'
}, { quoted: m })
ws.close()
} else {
m.reply('💢 *Gagal memproses gambar di server AI.*')
ws.close()
}
break
}
})
}

handler.help = ['encange']
handler.tags = ['tools']
handler.command = /^(encange)$/i
handler.premium = true
handler.register = true

export default handler