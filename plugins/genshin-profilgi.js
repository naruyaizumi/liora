
let handler = async (m, { conn, args, usedPrefix, command }) => {
let uid = args[0]
if (!uid || isNaN(uid)) return m.reply(`🌸 *Masukkan UID Genshin yang valid!*\n\n*Contoh: ${usedPrefix + command} 801234567*`)
await global.loading(m, conn)
try {
let data = await (await fetch(`https://enka.network/api/uid/${uid}`)).json()
let teks = `
╭─❍ *Profil Genshin kamu* ❍─╮
🧸 *Nickname: ${data.playerInfo.nickname}*
🎐 *Signature: ${data.playerInfo.signature || 'Tidak ada'}*
🎀 *Level Petualang: ${data.playerInfo.level}*
🎀 *World Level: ${data.playerInfo.worldLevel || '0'}*
🏆 *Achievement: ${data.playerInfo.finishAchievementNum}*
⚔️ *Abyss: Lantai ${data.playerInfo.towerFloorIndex || '0'} • Ruang ${data.playerInfo.towerLevelIndex || '0'}*
╰───────────────๑
`.trim()
let response = await fetch(global.API("btz", "/api/tools/ssweb", {
url: `https://enka.network/u/${uid}`,
device: "desktop"
}, "apikey"))
if (!response.ok) throw new Error(`HTTP Error ${response.status}`)
let buffer = Buffer.from(await response.arrayBuffer())
await conn.sendFile(m.chat, buffer, 'profilgenshin.jpg', teks, m)
} catch (e) {
console.error(e)
m.reply("❌ *Gagal mengambil data atau screenshot profil Genshin.*")
} finally {
await global.loading(m, conn, true)
}
}

handler.help = ['profilgenshin']
handler.tags = ['genshin']
handler.command = /^(profilgenshin|profilgi|profilegi|profilgi)$/i
handler.limit = true
handler.register = true

export default handler