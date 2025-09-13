
let handler  = async (m, { conn }) => {
conn.reply(m.chat,`${pickRandom(tolol)}`, m)
}
handler.help = ['tololcek']
handler.tags = ['fun']
handler.command = /^(tololcek)$/i
handler.register = true

export default handler 

function pickRandom(list) {
return list[Math.floor(list.length * Math.random())]
}

const tolol = [
'*Tolol Level : 4%*\n\n*AMAN BANGET!*',
'*Tolol Level : 7%*\n\n*Masih Aman*',
'*Tolol Level : 12%*\n\n*Aman Kok*',
'*Tolol Level : 22%*\n\n*Hampir Aman*',
'*Tolol Level : 27%*\n\n*Tolol dikit*',
'*Tolol Level : 35%*\n\n*Tolol ¼*',
'*Tolol Level : 41%*\n\n*Dah lewat dri Aman*',
'*Tolol Level : 48%*\n\n*Setengah Tolol*',
'*Tolol Level : 56%*\n\n*Lu Tolol juga*',
'*Tolol Level : 64%\n\n*Lumayan Tolol*',
'*Tolol Level : 71%*\n\n*Hebatnya ketololan lu*',
'*Tolol Level : 1%*\n\n*99% LU GAK TOLOL!*',
'*Tolol Level : 77%*\n\n*Gak akan Salah Lagi dah tololnya lu*',
'*Tolol Level : 83%*\n\n*Dijamin tololnyan*',
'*Tolol Level : 89%*\n\n*Tolol Banget!*',
'*Tolol Level : 94%*\n\n*Setolol Om Deddy*😂',
'*Tolol Level : 100%*\n\n*LU ORANG TERTOLOL YANG PERNAH ADA!!!*',
'*Tolol Level : 100%*\n\n*LU ORANG TERTOLOL YANG PERNAH ADA!!!*',
'*Tolol Level : 100%*\n\n*LU ORANG TERTOLOL YANG PERNAH ADA!!!*',
'*Tolol Level : 100%*\n\n*LU ORANG TERTOLOL YANG PERNAH ADA!!!*',
]