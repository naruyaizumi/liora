
import { load } from "cheerio"

let handler = async (m, { text, usedPrefix, command, conn }) => {
try {
if (!text) return m.reply(`⚠️ *Teks pencarian tidak ditemukan!*\n\n📌 *Contoh:*\n${usedPrefix + command} kejadian`)
await global.loading(m, conn)
let response = await fetch(`https://alkitab.me/search?q=${encodeURIComponent(text)}`, {
headers: { "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/55.0.2883.87 Safari/537.36" }
})
if (!response.ok) throw new Error(`Gagal menghubungi server: ${response.status}`)
let html = await response.text()
let $ = load(html)
let result = []
$("div.vw").each((_, el) => {
let teks = $(el).find("p").text().trim()
let link = $(el).find("a").attr("href") || "#"
let title = $(el).find("a").text().trim()
if (teks && title) result.push({ teks, link, title })
})
if (!result.length) return m.reply("⚠️ *Tidak ditemukan hasil pencarian!*")
let first = result[0]
let others = result.slice(1).map(v => `📖 *${v.title}*\n🔗 *${v.link}*`).join("\n\n") || "⛔ Tidak ada hasil lainnya."
await conn.sendMessage(m.chat, {
text: `📖 *Hasil Pencarian Alkitab: ${text}*\n\n📌 *${first.title}*\n📝 *Isi:* ${first.teks}\n🔗 *Link: ${first.link}*\n\n🌿 *Hasil lainnya:*\n${others}`,
contextInfo: {
externalAdReply: {
title: first.title,
body: "📖 Hasil Pencarian Alkitab",
thumbnailUrl: "https://telegra.ph/file/a333442553b1bc336cc55.jpg",
sourceUrl: "https://instagram.com/naruyaizumi_",
mediaType: 1,
renderLargerThumbnail: true
}
}
}, { quoted: m })

} catch (e) {
console.error(e)
m.reply("❌ *Terjadi Kesalahan! Coba lagi nanti.*")
} finally {
await global.loading(m, conn, true)
}
}

handler.help = ["alkitab"]
handler.tags = ["internet"]
handler.command = /^(alkitab)$/i
handler.premium = true
handler.register = true

export default handler