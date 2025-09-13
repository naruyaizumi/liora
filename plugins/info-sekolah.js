
const API_BASE_URL = 'https://api-sekolah-indonesia.vercel.app/sekolah';

const handler = async (m, { conn, args }) => {
try {
if (!args[0] || args[0] === 'help') {
return m.reply(`*🏫 Sekolah Indonesia API*\n\n` +
`*🔹 Contoh Penggunaan:*\n` +
`• .sekolah all (Menampilkan seluruh data sekolah)\n` +
`• .sekolah jenjang <jenjang> (SD, SMP, SMA, SMK)\n` +
`• .sekolah search <nama_sekolah>\n` +
`• .sekolah filter <parameter> <value>\n` +
`• .sekolah npsn <npsn>`);
}

const command = args[0].toLowerCase()
let apiUrl
let response
let result

await global.loading(m, conn)

switch (command) {
case 'all':
apiUrl = `${API_BASE_URL}?page=1&perPage=5`
break

case 'jenjang':
if (!args[1]) return m.reply('❌ Mohon sertakan jenjang (SD, SMP, SMA, SMK)')
apiUrl = `${API_BASE_URL}/${args[1].toUpperCase()}?page=1&perPage=5`
break

case 'search':
if (!args[1]) return m.reply('❌ Mohon sertakan nama sekolah')
apiUrl = `${API_BASE_URL}/s?sekolah=${encodeURIComponent(args.slice(1).join(' '))}`
break

case 'filter':
if (args.length < 3) return m.reply('❌ Format salah! Contoh: .sekolah filter provinsi 071700')
apiUrl = `${API_BASE_URL}?${args[1]}=${args[2]}&page=1&perPage=5`
break

case 'npsn':
if (!args[1]) return m.reply('❌ Mohon sertakan NPSN')
apiUrl = `${API_BASE_URL}?npsn=${args[1]}`
break

default:
return m.reply('❌ Command tidak dikenali. Ketik .sekolah help untuk bantuan')
}

// Fetch request
response = await fetch(apiUrl)
if (!response.ok) throw new Error(`HTTP ${response.status} - ${response.statusText}`)
result = await response.json()

if (!result.dataSekolah || result.dataSekolah.length === 0) {
return m.reply(`🔍 *Data sekolah tidak ditemukan*`)
}

if (command === 'npsn') {
let s = result.dataSekolah[0]
return m.reply(`*🏫 Detail Sekolah*\n` +
`*Nama:* *${s.sekolah}*\n` +
`📍 *Alamat:* ${s.alamat_jalan}\n` +
`🏫 *Bentuk:* ${s.bentuk}\n` +
`🔢 *NPSN:* ${s.npsn}\n` +
`🌍 *Kecamatan:* ${s.kecamatan}`)
}

const daftar = result.dataSekolah.map((item, i) =>
`*${i + 1}.* *${item.sekolah}* (${item.kecamatan})\n` +
`📍 *Alamat:* ${item.alamat_jalan}\n` +
`🏫 *Bentuk:* ${item.bentuk}\n` +
`🔢 *NPSN:* ${item.npsn}`
).join('\n\n')

let title = {
all: '📚 Daftar Sekolah Indonesia',
jenjang: `📚 Daftar Sekolah Jenjang ${args[1].toUpperCase()}`,
search: `🔎 Hasil Pencarian Sekolah "${args.slice(1).join(' ')}"`,
filter: `💼 Hasil Filter Sekolah berdasarkan ${args[1]} "${args[2]}"`
}

return m.reply(`*${title[command] || '📚 Daftar Sekolah'}*\n\n${daftar}`)

} catch (error) {
console.error(error)
let msg = `❌ Gagal memproses permintaan`

if (error.message.includes('404')) {
msg = '🔍 Data tidak ditemukan (404)'
} else if (error.message.includes('504')) {
msg = '⚠ Gateway Timeout (504)'
} else {
msg += `\n\n📌 ${error.message}`
}

return m.reply(`${msg}\n\nSilakan coba lagi nanti atau hubungi developer.`)
}
}

handler.help = ['sekolah']
handler.tags = ['info']
handler.command = /^sekolah$/i
handler.limit = true
handler.register = true

export default handler