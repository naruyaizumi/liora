const formatPlayerDate = (dateStr) => {
try {
const date = parse(dateStr, 'd MMM yyyy', new Date()) || 
parse(dateStr, 'dd MMM yyyy', new Date()) ||
new Date(dateStr)
return format(date, 'dd MMMM yyyy', { locale: id })
} catch {
return dateStr
}
}

const validatePlayerData = (data) => {
if (!data || typeof data !== 'object') return false
const requiredFields = ['name', 'profileUrl']
return requiredFields.every(field => data[field] && typeof data[field] === 'string')
}
const handler = async (m, { conn }) => {
const args = m.text.trim().split(/\s+/)
const query = args.slice(1).join(' ') 
if (!query) return m.reply('*🌸 Contoh penggunaan:*\n*.transfermarkt cristiano ronaldo*')
try {
await global.loading(m, conn)   
const res = await fetch(`https://zenzxz.dpdns.org/search/transfermarkt?query=${encodeURIComponent(query)}`)
if (!res.ok) throw new Error(`HTTP ${res.status}`)
const { status, creator, data } = await res.json()    
if (!status || !data) throw new Error('Data pemain tidak ditemukan di database Transfermarkt')
if (!validatePlayerData(data)) throw new Error('Data pemain tidak valid')
    
const playerData = {
name: data.name || 'Tidak diketahui',
shirtNumber: data.shirtNumber || '',
photo: data.photo || 'https://cloudkuimages.guru/uploads/images/4vq7ak3w.jpg',
birthdate: data.birthdate || 'Tidak diketahui',
age: data.age || '',
nationality: data.nationality || 'Tidak diketahui',
height: data.height || 'Tidak diketahui',
foot: data.foot || 'Tidak diketahui',
position: data.position || 'Tidak diketahui',
agent: data.agent || 'Tidak diketahui',
contractUntil: data.contractUntil || 'Tidak diketahui',
marketValue: data.marketValue || 'Tidak diketahui',
club: data.club || 'Tidak diketahui',
league: data.league || 'Tidak diketahui',
profileUrl: data.profileUrl || 'https://www.transfermarkt.co.id'
}
const formattedBirthdate = formatPlayerDate(playerData.birthdate)
const formattedContract = formatPlayerDate(playerData.contractUntil)
const caption = `
*🏵️ PLAYER PROFILE 🏵️*

*💮 Nama: ${playerData.name}${playerData.shirtNumber ? ` (#${playerData.shirtNumber})` : ''}*
*🎂 Lahir: ${formattedBirthdate}${playerData.age ? ` (${playerData.age} tahun)` : ''}*
*🍂 Negara: ${playerData.nationality}*
*🍁 Tinggi: ${playerData.height}*
*🍡 Kaki: ${playerData.foot}*
*🍥 Posisi: ${playerData.position}*
*🍕 Agen: ${playerData.agent}*
*🍪 Kontrak: ${formattedContract}*
*🍬 Nilai: ${playerData.marketValue}*
*🌼 Klub: ${playerData.club}*
*🍩 Liga: ${playerData.league}*

*🔗 Profil: ${playerData.profileUrl}*
    `.trim()

await conn.sendFile(m.chat, playerData.photo, 'player.jpg', caption, m, null, {
})
} catch (error) {
console.error('Transfermarkt Gagal:', error)
await m.reply(`*❌ Gagal! ${error.message}*\n\n*Coba cari pemain lain atau coba lagi nanti*`)
} finally {
await global.loading(m, conn, true)
}
}

handler.help = ['transfermarkt']
handler.command = /^(transfermarkt)$/i
handler.tags = ['search']
handler.limit = true
handler.register = true

export default handler