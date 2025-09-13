
let handler  = async (m, { conn }) => {
conn.reply(m.chat,`${pickRandom(wibu)}`, m)
}
handler.help = ['wibucek']
handler.tags = ['fun']
handler.command = /^(wibucek)$/i
handler.register = true
export default handler 

function pickRandom(list) {
return list[Math.floor(list.length * Math.random())]
}

const wibu = [
'*Wibu Level : 4%*\n\n*Masih Aman Lah Yaa!*',
'*Wibu Level : 7%*\n\n*Masih Aman*',
'*Wibu Level : 12%*\n\n*Aman Kok*',
'*Wibu Level : 22%*\n\n*Hampir Aman*',
'*Wibu Level : 27%*\n\n*Wibu dikit*',
'*Wibu Level : 35%*\n\n*Wibu ¼*',
'*Wibu Level : 41%*\n\n*Dah lewat dri Aman*',
'*Wibu Level : 48%*\n\n*Setengah Wibu*',
'*Wibu Level : 56%*\n\n*Lu Wibu juga*',
'*Wibu Level : 64%*\n\n*Lumayan Wibu*',
'*Wibu Level : 71%*\n\n*Pasti Lu Punya Seribu Waifu*',
'*Wibu Level : 1%*\n\n*99% LU GAK Wibu!*',
'*Wibu Level : 77%*\n\n*Gak akan Salah Lagi dah Wibunya lu*',
'*Wibu Level : 83%*\n\n*Dijamin Sepuhnya Wibu*',
'*Wibu Level : 89%*\n\n*Fix Wibu Elite!*',
'*Wibu Level : 94%*\n\n*Udah Elite Sih Ini*😂',
'*Wibu Level : 100%*\n\n*BAU BAWANGNYA SAMPE SINI CUY!!!*',
'*Wibu Level : 100%*\n\n*BAU BAWANGNYA SAMPE SINI CUY!!!*',
'*Wibu Level : 100%*\n\n*BAU BAWANGNYA SAMPE SINI CUY!!!*',
'*Wibu Level : 100%*\n\n*BAU BAWANGNYA SAMPE SINI CUY!!!*',
]