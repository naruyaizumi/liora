
let handler = async (m, { conn, text, usedPrefix, command }) => {
try {
if (!text) return m.reply(`📢 *Silahkan masukkan nama karakter!*\n\n📌 *Contoh:*\n${usedPrefix + command} Shiroko`)
await global.loading(m, conn)
let response = await fetch(`https://api-blue-archive.vercel.app/api/characters/students?name=${encodeURIComponent(text)}`)
if (!response.ok) return m.reply("⚠️ *Gagal mengambil data!*")
let { data } = await response.json()
if (!data || data.length === 0) return m.reply("⚠️ *Nama karakter tidak ditemukan!*")
let { names, age, birthday, school, hobbies, height, weapon, background, image, photoUrl } = data[0]
let caption = `🎀 *[ CHARA BLUE ARCHIVE INFO ]* 🎀
📛 *Nama : ${names.japanName}*
*[ ${names.firstName} ${names.lastName} ]*
🎂 *Umur : ${age} Tahun*
📅 *Ulang Tahun : ${birthday}*
🏫 *Sekolah : ${school}*
🎨 *Hobi : ${hobbies.map(h => `🎭 ${h}`).join(", ")}*
📏 *Tinggi : ${height} cm*
🔫 *Senjata : ${weapon}*
━━━━━━━━━━━━━━━━━━━
📝 *Deskripsi :* 
${background}`.trim()
await conn.sendMessage(m.chat, {
text: caption,
contextInfo: {
externalAdReply: {
title: `${names.japanName} - ${school}`,
body: "💠 Karakter Blue Archive 💠",
thumbnailUrl: image || photoUrl,
sourceUrl: "https://instagram.com/naruyaizumi_",
mediaType: 1,
renderLargerThumbnail: true
}
}
}, { quoted: m })
} catch (e) {
console.error(e)
m.reply("⚠️ Terjadi kesalahan, coba lagi nanti.")
} finally {
await global.loading(m, conn, true)
}
}

handler.help = ["bluearchive"]
handler.tags = ["anime"]
handler.command = /^(ba|bluearchive)$/i
handler.premium = true
handler.register = true

export default handler