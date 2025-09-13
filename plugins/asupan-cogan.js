
let handler = async (m, { conn }) => {
try {
await global.loading(m, conn)
let res = await fetch('https://raw.githubusercontent.com/veann-xyz/result-daniapi/main/cecan/cogan.json')
let json = await res.json()
let image = json[Math.floor(Math.random() * json.length)]
conn.sendFile(m.chat, image, 'cogan.jpeg', null, m, false)
} catch (e) {
throw e
} finally {
await global.loading(m, conn, true)
}
}

handler.help = ['cogan']
handler.tags = ['random']
handler.command = /^(cogan)$/i
handler.limit = true
handler.register = true

export default handler