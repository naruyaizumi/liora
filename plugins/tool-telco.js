
const API_CONFIG = {
veriphone: {
url: 'https://api.veriphone.io/v2/verify',
key: '354FD1811B4E4D1F85D8BB0B8E02874D'
},
numlookup: {
url: 'https://api.numlookupapi.com/v1/validate',
key: 'num_live_jloci83t4SBzi13C6FMUnPisbdsZqeK0CB2kK23R'
}
}
let handler = async (m, { conn, args, usedPrefix, command }) => {
if (!args[0]) return conn.reply(m.chat,
`📱 *Cara Pakai: ${usedPrefix + command} 08123456789*\n\n` +
`🔧 *Supported APIs:*\n*• Veriphone.io*\n*• NumLookupAPI*\n\n` +
`⚠️ *Note: Limit 500 request/hari (Veriphone)*`,
m
)
let number = args[0].replace(/\D/g, '')
if (!number.match(/^[0-9]{10,14}$/)) return conn.reply(m.chat, '❌ *Format nomor tidak valid! Harus 10-14 digit angka.*', m)
try {
let apiUrl = `${API_CONFIG.veriphone.url}?phone=${number}&key=${API_CONFIG.veriphone.key}`
let res = await fetch(apiUrl)
let data = await res.json()
if (!data?.phone_valid) {
apiUrl = `${API_CONFIG.numlookup.url}/${number}?apikey=${API_CONFIG.numlookup.key}`
res = await fetch(apiUrl)
data = await res.json()
}
let carrier = data.carrier || data.line_type || 'Tidak diketahui'
let country = data.country || data.country_name || 'Indonesia'
let valid = data.phone_valid ? 'Valid' : 'Tidak valid'
await conn.reply(m.chat,
`*📡 HASIL CEK NOMOR*\n\n` +
`*• Nomor: ${number}*\n` +
`*• Operator:* ${carrier}*\n` +
`*• Negara:* ${country}*\n` +
`*• Status:* ${valid}*\n\n` +
`⚡ *Powered by ${apiUrl.includes('veriphone') ? 'Veriphone.io' : 'NumLookupAPI'}*\n` +
`📅 *${new Date().toLocaleString()}*`,
m,
{ mentions: [m.sender] }
)

} catch (e) {
console.error('Telco Check Error:', e)
conn.reply(m.chat,
`*⚠️ Gagal memeriksa nomor.*\n` +
`*Penyebab:*\n` +
`- *API limit tercapai*\n` +
`- *Nomor tidak valid"\n` +
`- *Koneksi bermasalah"\n\n` +
`*Coba lagi nanti atau gunakan nomor berbeda.*`,
m
)
}
}

handler.help = ['telco <nomor>']
handler.tags = ['tools']
handler.command = /^(telco|ceknomor|infohp|infotel)$/i
handler.limit = true
handler.register = true

export default handler