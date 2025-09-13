
import * as cheerio from 'cheerio'

let handler = async (m, { conn, usedPrefix, command, text }) => {
if (!text) return m.reply(`*Masukan Kata!* 🍭\n\n*Contoh:* \n*${usedPrefix + command} keren*`)
let kata = await sinonim(text)
if (!kata.result.length) return m.reply(`❌ *Sinonim tidak ditemukan untuk:* ${text}`)
m.reply('🍓 *Sinonim dari* `' + text + '`:\n\n' + kata.result.map(v => '• ' + v + ' 🍬').join('\n'))
}
handler.help = ['sinonim']
handler.tags = ['internet']
handler.command = /^(sinonim)$/i
handler.register = true

export default handler

async function sinonim(kata) {
let res = await fetch("https://m.persamaankata.com/search.php?q=" + encodeURIComponent(kata))
let html = await res.text()
let $ = cheerio.load(html)
let h = []
$("div.word_thesaurus > a").each(function(e, a) {
h.push($(a).text())
})
let image = $("img#visual_synonym_img").attr("src")
return {
image: image,
result: h
}
}