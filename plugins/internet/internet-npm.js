let handler = async (m, { conn, text }) => {
    if (!text) return m.reply("🍡 *Masukkan query pencarian NPM!*")

    let res = await fetch(`http://registry.npmjs.com/-/v1/search?text=${encodeURIComponent(text)}`)
    let { objects } = await res.json()

    if (!objects.length) return m.reply(`🍓 *Query "${text}" tidak ditemukan.*`)

    let limited = objects.slice(0, 20)

    let txt = limited.map(({ package: pkg }, i) => {
        return `🍧 *${i + 1}. ${pkg.name} (v${pkg.version})*\n🍰 *${pkg.links.npm}*`
    }).join`\n\n`

    await conn.sendMessage(m.chat, { text: txt }, { quoted: m })
}

handler.help = ["npmsearch"]
handler.tags = ["internet"]
handler.command = /^(npm(js|search)?)$/i

export default handler