
let handler = async (m) => {
let totalreg = Object.keys(global.db.data.users).length
let rtotalreg = Object.values(global.db.data.users).filter(user => user.registered == true).length
let untotalreg = Object.values(global.db.data.users).filter(user => user.registered == false).length
m.reply(`*List Jumlah User:*\n*Register: ${rtotalreg}*\n*UnRegister: ${untotalreg}*\n*TotalUser: ${totalreg}*`)
}
handler.help = ['database']
handler.tags = ['info']
handler.command = /^(database|jumlahdatabase|user)$/i
handler.owner = true
handler.register = true
export default handler
