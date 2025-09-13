
let handler = async (m, { conn, text, usedPrefix, command }) => {
try {
if (!text) return m.reply(`🍩 *Masukan Nama Character!*\n\n🍰 *Contoh: ${usedPrefix + command} Hu Tao*`)
await global.loading(m, conn)
let url = API("https://genshin-db-api.vercel.app", "/api/v5/characters", { query: text }, false)
let res = await fetch(url)
let data = await res.json()

let txt = `
🍓 *❃ Name: ${data.name}*
🍡 *❃ Title: ${data.title}*

🍬 *❃ Desc:* _${data.description}_

🍭 *❃ Element: ${data.elementText}*
🍫 *❃ Weapon Type: ${data.weaponText}*
🍪 *❃ Substat: ${data.substatText}*
🧁 *❃ Gender: ${data.gender}*
🍮 *❃ Affiliation: ${data.affiliation}*
🍰 *❃ Birthday: ${data.birthday}*
🍨 *❃ Constellation: ${data.constellation}*

🍧 *❃ CV:*
🍬 *• English ~ ${data.cv.english}*
🍬 *• Chinese ~ ${data.cv.chinese}*
🍬 *• Japanese ~ ${data.cv.japanese}*
🍬 *• Korean ~ ${data.cv.korean}*
`.trim()
conn.sendFile(m.chat, data.images.cover1, null, txt, m)
} catch (e) {
throw e
} finally {
await global.loading(m, conn, true)
}
}

handler.help = ['charagenshin']
handler.tags = ['genshin']
handler.command = /^(chara(gi|genshin)|genshin(chara|character))$/i
handler.limit = true
handler.register = true

export default handler