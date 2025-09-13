
import { parsePhoneNumber } from "awesome-phonenumber"

let handler = async (m, { conn, text }) => {
try {
await global.loading(m, conn)
let userJid = m.mentionedJid?.[0] || (text && /^\d+$/.test(text) ? text + "@s.whatsapp.net" : null)
let userNumber = userJid.split('@')[0]
let [cek] = await conn.onWhatsApp(userJid)
if (!cek?.exists) return m.reply(`🍩 *Nomor tidak terdaftar di WhatsApp!*`)
let pp = await conn.profilePictureUrl(userJid, 'image').catch(_ => 'https://i.supa.codes/tsUECa')
let status = await conn.fetchStatus(userJid).catch(() => ({ status: 'Tidak tersedia' }))
let bisnis = await conn.getBusinessProfile?.(userJid).catch(() => null)
let pn = parsePhoneNumber('+' + userNumber)
let country = pn.valid ? pn.regionCode : 'Tidak diketahui'
let presenceStatus = 'Tidak tersedia'
try {
await conn.presenceSubscribe(userJid)
await new Promise(r => setTimeout(r, 1500))
let presence = conn.presence?.[userJid]?.lastKnownPresence || ''
presenceStatus =
presence === 'available' ? 'Online' :
presence === 'composing' ? 'Sedang Mengetik...' :
presence === 'recording' ? 'Sedang Merekam...' :
presence === 'paused' ? 'Mengetik Berhenti...' : 'Offline'
if (presenceStatus === 'Offline') {
let userData = global.db.data.users[userJid] || {}
userData.lastseen = +new Date
global.db.data.users[userJid] = userData
}
} catch {
presenceStatus = 'Tidak bisa dideteksi'
}
const userData = global.db?.data?.users?.[userJid] || {}
const lastSeen = userData.lastseen || 0
let showLastSeen = !presenceStatus.includes('Online')
let lastSeenText = showLastSeen && lastSeen ? formatLastSeen(lastSeen) : '-'
let caption = `🍓 *Profil WhatsApp ditemukan!*
🍭 *Nomor:* @${userNumber}
🧁 *Status: ${status.status || 'Tidak tersedia'}*
🍬 *Kehadiran: ${presenceStatus}*
${showLastSeen ? `🍡 *Terakhir terlihat: ${lastSeenText}*` : ''}
🎌 *Negara: ${country}*
${bisnis?.description ? `🍰 *Bisnis: ${bisnis.description}*` : ''}
${bisnis?.category ? `📦 *Kategori: ${bisnis.category}*` : ''}`.trim()
await conn.sendFile(m.chat, pp, 'profile.jpg', caption, m, null, { mentions: [userJid] })
} catch (e) {
console.error(e)
m.reply("🍩 *Gagal mengambil data profil, mungkin nomornya salah atau disembunyikan~*")
} finally {
await global.loading(m, conn, true)
}
}

handler.help = ['stalkwa']
handler.tags = ['tools']
handler.command = /^(stalkwa|getwa|cekwa)$/i
handler.register = true
handler.limit = true

export default handler

function formatLastSeen(timestamp) {
let date = new Date(timestamp)
return date.toLocaleString('id-ID', {
weekday: 'long',
year: 'numeric',
month: 'long',
day: 'numeric',
hour: '2-digit',
minute: '2-digit',
second: '2-digit',
timeZone: 'Asia/Jakarta'
}) + ' WIB'
}