
let handler = async (m, { conn, usedPrefix }) => {
await conn.fetchBlocklist().then(async data => {
let txt = `🍩 *「  Daftar Nomor yang Diblokir 」*\n\n🍰 *Total: ${data.length}*\n\n*┌─🍡*\n`
for (let i of data) {
txt += `*├ 🍬 @${i.split("@")[0]}*\n`
}
txt += "*└────🍓*"
return conn.reply(m.chat, txt, m, { mentions: await conn.parseMention(txt) })
}).catch(err => {
console.log(err)
return m.reply('🍪 *Tidak ada yang diblokir~*')
})
}

handler.help = ['listblock']
handler.tags = ['info']
handler.command = /^(listb(lo(ck|k)?)?)$/i
handler.owner = true

export default handler