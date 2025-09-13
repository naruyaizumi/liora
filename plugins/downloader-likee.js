
import * as cheerio from 'cheerio'
const regex = /https:\/\/l\.likee\.video\/v\/[A-Za-z0-9]+/i

let handler = async (m, { conn, usedPrefix, command, text }) => {
try {
if (!text) return m.reply(`🍡 *Masukkan link Likee!*\n\n*Contoh:${usedPrefix + command} https://l.likee.video*`)
if (!text.match(regex)) return m.reply("🍰 *Itu bukan link Likee yang valid!*")
await global.loading(m, conn)
let result = await LikeDown(text)
if (result.status !== 200) return m.reply("🍮 *Gagal mengambil video!*")
await conn.sendFile(m.chat, result.no_watermark, null, result.title, m)
} finally {
await global.loading(m, conn, true)
}
}

handler.help = ["likee"]
handler.tags = ["downloader"]
handler.command = /^(like(e)?)$/i
handler.limit = true
handler.register = true

export default handler

async function LikeDown(url) {
let body = new URLSearchParams({ id: url, locale: "en" })
let res = await fetch("https://likeedownloader.com/process", {
method: "POST",
body,
headers: {
cookie: "_ga=GA1.2.553951407.1656223884; _gid=GA1.2.1157362698.1656223884; __gads=ID=0fc4d44a6b01b1bc-22880a0efed2008c:T=1656223884:RT=1656223884:S=ALNI_MYp2ZXD2vQmWnXc2WprkU_p6ynfug; __gpi=UID=0000069517bf965e:T=1656223884:RT=1656223884:S=ALNI_Map47wQbMbbf7TaZLm3TvZ1eI3hZw; PHPSESSID=e3oenugljjabut9egf1gsji7re; _gat_UA-3524196-10=1",
"user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/102.0.0.0 Safari/537.36"
}
})
let html = await res.text()
let $ = cheerio.load(html)
return {
status: 200,
title: $("p.infotext").eq(0).text().trim(),
thumbnail: $(".img_thumb img").attr("src"),
watermark: $(".with_watermark").attr("href"),
no_watermark: $(".without_watermark").attr("href")
}
}