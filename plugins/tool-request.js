
let handler = async (m, { conn, args, usedPrefix, command }) => {
if (!args[0] || isNaN(args[0])) return m.reply(`💳 *Masukkan jumlah nominal yang valid!*\n\n📌 *Contoh:* ${usedPrefix + command} 10000`)
let amount = args[0]
let from = conn.user?.id || '12066409886@s.whatsapp.net'
await conn.sendMessage(m.chat, {
requestPayment: {
currency: "IDR",
amount: amount,
from: from,
note: `🍩 *Halo! Mohon bantuannya untuk pembayaran sebesar Rp${amount}. Terima kasih ya~*`,
}
}, { quoted: m })
}

handler.help = ['request']
handler.tags = ['tools']
handler.command = /^request$/i
handler.owner = true

export default handler