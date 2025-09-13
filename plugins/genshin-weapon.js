
let handler = async (m, { conn, usedPrefix, command, text }) => {
if (!text) return m.reply(`🍭 *Masukkan nama senjata dulu ya sayang!* \n\n*Contoh: ${usedPrefix + command} Hunter's Bow*`)
try {
await global.loading(m, conn)
let res = await fetch(`https://genshin-db-api.vercel.app/api/v5/weapons?query=${encodeURIComponent(text)}`)
let data = await res.json()
let caption = `
🍡 *Name: ${data.name}*
🍬 *Description: ${data.description}*
🍫 *Weapon Type: ${data.weaponText}*
🍰 *Base Attack: ${data.baseAtkValue.toString().split(".")[0]}*
🍩 *Rarity: ${data.rarity}*

📖 *Story:*
${data.story}
`.trim()
await conn.sendFile(m.chat, data.images.icon, data.title + ".jpg", caption, m)
} catch (e) {
throw e
} finally {
await global.loading(m, conn, true)
}
}

handler.help = ["giweapon"]
handler.tags = ["genshin"]
handler.command = /^((gi|genshin|genshinimpact)weapon|weapon(gi|genshin|genshinimpact))$/i
handler.limit = true
handler.register = true

export default handler