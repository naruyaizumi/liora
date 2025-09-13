
let handler = async (m, { conn, usedPrefix, command, args }) => {
try {
await global.loading(m, conn)
if (!args.length) return m.reply(`⚠️ *Masukkan kode yang ingin dijadikan gambar!*\n\n📌 *Contoh: ${usedPrefix + command} console.log("Hello World!")*`)
let code = args.join(" ")
let apiUrl = global.API("btz", "/api/maker/carbon", { text: code }, "apikey")
let response = await fetch(apiUrl)
if (!response.ok) return m.reply('⚠️ *Terjadi kesalahan saat memproses gambar. Coba lagi nanti!*')
let json = await response.json()
if (!json.status || !json.result) return m.reply('⚠️ *Gagal mendapatkan hasil. Coba lagi nanti!*')
await conn.sendMessage(m.chat, { image: { url: json.result }, caption: `💻 *Kode telah diubah menjadi gambar!*\n\`\`\`${code}\`\`\`` }, { quoted: m })
} catch (e) {
console.error(e)
m.reply(`❌ *Terjadi Kesalahan Teknis!*\n⚠️ *Detail:* ${e.message}`)
} finally {
await global.loading(m, conn, true)
}
}

handler.help = ['carbon']
handler.tags = ['tools']
handler.command = /^(carbon|code2img)$/i
handler.premium = true

export default handler