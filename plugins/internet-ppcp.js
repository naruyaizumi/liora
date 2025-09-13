
let handler = async (m, { conn }) => {
await global.loading(m, conn)
let url = await global.API('btz', '/api/wallpaper/couplepp', {}, 'apikey')
let res = await (await fetch(url)).json()
let cowo = await (await fetch(res.result.male)).buffer()
await conn.sendFile(m.chat, cowo, '', '🍫 *Nih pp buat cowoknya~*', m)
let cewe = await (await fetch(res.result.female)).buffer()
await conn.sendFile(m.chat, cewe, '', '🍓 *Nih pp buat ceweknya~*', m)
await global.loading(m, conn, true)
}

handler.help = ['ppcouple']
handler.tags = ['internet']
handler.command = /^(pp(cp|couple))$/i
handler.limit = true
handler.register = true

export default handler