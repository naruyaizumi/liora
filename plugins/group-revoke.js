
let handler = async (m, { conn, args, participants, usedPrefix, command }) => {
try {
let newCode = await conn.groupRevokeInvite(m.chat)
m.reply(`🍓 *Link undangan grup berhasil di-revoke!*\n\n🔗 *Link baru: https://chat.whatsapp.com/${newCode}*`)
} catch (e) {
console.error(e)
m.reply('🍩 *Gagal me-revoke link grup. Coba lagi nanti yaa~*')
}
}

handler.help = ['revoke']
handler.tags = ['group']
handler.command = /^re(voke|new)(invite|link)?$/i
handler.group = true
handler.botAdmin = true
handler.admin = true

export default handler