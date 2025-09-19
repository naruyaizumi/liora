let handler = async (m, { conn, args, usedPrefix, command }) => {
if (!args[0]) return m.reply(`🍱 *Please provide a valid XNXX video link!*\n\n🍜 *Example:*\n${usedPrefix + command} https://www.xnxx.com/video-xxxx`)
if (!args[0].includes("xnxx.com")) return m.reply("🍟 *Invalid link! Please enter a valid XNXX link.*")
await global.loading(m, conn)
try {
// TODO: API is still under maintenance, replace logic below once it's fixed
// let res = await fetch(global.API("btz", "/api/download/xnxxdl", { url: args[0] }, "apikey"))
// let json = await res.json()
// if (!json.status) throw new Error("Failed to fetch video data!")
//
// let { title, url, views, duration, quality, thumb } = json.result
//
// await conn.sendFile(m.chat, url, "xnxx.mp4", `🍙 *Title:* ${title}\n🍤 *Duration:* ${duration}\n🍘 *Views:* ${views}\n🍱 *Quality:* ${quality}`, m, { asDocument: false })

m.reply("⚠️ *TODO:* The XNXX Downloader feature is currently under maintenance. Please wait for the next update 🍜")
} catch (e) {
console.error(e)
m.reply("🍧 *An error occurred while trying to fetch from XNXX!*")
} finally {
await global.loading(m, conn, true)
}
}

handler.help = ["xnxxdl"]
handler.tags = ["downloader"]
handler.command = /^(xnxxdl)$/i
handler.premium = true

export default handler