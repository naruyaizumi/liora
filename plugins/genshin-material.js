
let handler = async (m, { conn, usedPrefix, command, text }) => {
try {
if (!text) return m.reply(`*Masukan nama material!* \n\n*Contoh: ${usedPrefix + command} Glaze Lily*`)
await global.loading(m, conn)
let res = await fetch(API("https://genshin-db-api.vercel.app", "/api/v5/materials", { query: text }, false))
let data = await res.json()
let caption = `
🍰 *Name: ${data.name}*
🍩 *Sort Rank: ${data.sortRank}*
🍮 *Category: ${data.category}*
🍡 *Type: ${data.typeText}*

🍬 *Description:* _${data.description}_

🍭 *Sources:* 
${data.sources.map(v => v).join("\n")}
`.trim()
conn.sendFile(m.chat, `https://enka.network/ui/${data.images.filename_icon}.png`, data.title + ".jpg", caption, m)
} catch (e) {
throw e
} finally {
await global.loading(m, conn, true)
}
}

handler.help = ["gimaterial"]
handler.tags = ["genshin"]
handler.command = /^((gi|genshin|genshinimpact)material|material(gi|genshin|genshinimpact))$/i
handler.limit = true
handler.register = true

export default handler