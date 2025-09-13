import similarity from 'similarity'

const threshold = 0.9
const minimumScore = 8

export async function before(m, { conn, isAdmin, isBotAdmin }) {
if (m.isBaileys || m.fromMe || !m.text) return
let chat = global.db.data.chats[m.chat]
let who = m.mentionedJid?.[0] || m.fromMe ? conn.user.jid : m.sender
let isMods = [conn.decodeJid(conn.user.id), ...global.config.owner.filter(([num, _, dev]) => num && dev).map(([num]) => num)].map(v => v.replace(/\D/g, '') + '@s.whatsapp.net').includes(who)
let isOwner = m.fromMe || isMods || [conn.decodeJid(conn.user.id), ...global.config.owner.map(([num]) => num)].map(v => v.replace(/\D/g, '') + '@s.whatsapp.net').includes(who)
if (!chat.antipromosi || (chat.antipromosi_mod !== true && isAdmin) || isMods || isOwner || !isBotAdmin) return
let text = m.text.toLowerCase()
let score = 0
const keywords = {
'join grup': 3,
'wa.me': 3,
'klik link': 2,
'link grup': 3,
'open order': 2,
'panel': 3,
'digital ocean': 3,
'vps': 3,
'hosting': 2,
'buy': 2,
'sell': 2,
'wts': 2,
'wtb': 2,
'akun murah': 3,
'premium': 1,
'reseller': 2,
'dropship': 2,
'supplier': 2,
'jual': 2,
'jasa': 1,
'suntik': 2,
'convert pulsa': 4,
'contact admin': 2,
'admin panel': 2,
'nokos': 3,
'sewa bot': 2,
'unchek': 3,
'vcc': 2,
'database': 2,
'script bug': 2,
'source code': 1,
'ddos': 2,
'auto claim': 1,
'domain': 2,
'joki': 2,
'bot siap pakai': 2
}
const lightKeywords = {
'order': 0.5,
'ready': 0.5,
'akun': 0.5,
'subscribe': 0.5,
'harga': 0.5,
'murah': 0.5,
'promo': 0.5,
'diskon': 0.5,
'gratis': 0.5,
'trusted': 0.5,
'paypal': 0.5,
'dana': 0.5,
'transfer': 0.5,
'bank': 0.5,
'dompet digital': 0.5,
'web': 0.5,
'apk': 0.5,
'tools': 0.5,
'convert': 0.5,
'script': 0.5
}
let allKeywords = { ...keywords, ...lightKeywords }
for (let key in allKeywords) {
if (text.includes(key)) {
let count = (text.match(new RegExp(key, 'g')) || []).length
score += allKeywords[key] * Math.min(count, 3)
continue
}
const words = text.split(/\s+/)
for (let word of words) {
if (word.length < 4) continue
if (similarity(word, key) >= threshold) {
score += allKeywords[key]
break
}
}
}
if (text.includes('jual') && text.includes('murah')) score += 3
if (text.includes('convert') && text.includes('pulsa')) score += 3
if (text.includes('panel') && text.includes('vps')) score += 2
if (text.includes('akun') && text.includes('premium')) score += 2
if (text.includes('gratis') && text.includes('link')) score += 2
if (text.includes('panel') && text.includes('murah')) score += 2
const safeExamples = [
'email saya',
'akun saya',
'panel error',
'script error',
'saya transfer tugas',
'web error',
'kode html saya'
]
const safeKeywords = [
['sc', 'error'],
['script', 'error'],
['panel', 'error'],
['akun', 'error'],
['email', 'saya'],
['web', 'error'],
['transfer', 'tugas'],
['html', 'kode']
]
for (let [k1, k2] of safeKeywords) {
if (text.includes(k1) && text.includes(k2)) return
}
if (safeExamples.some(phrase => text.includes(phrase))) return
if (/(butuh|cari(in)?|pengen|mau|lagi nyari|nyariin|ada yang jual|nyari vps)/.test(text)) return
if (score >= minimumScore) {
try {
await conn.sendMessage(m.chat, {
delete: {
remoteJid: m.chat,
fromMe: false,
id: m.key.id,
participant: m.key.participant
}
})
await m.reply('🔥 *Promotional Text Detected!*')
} catch (e) {
console.error(e)
}
}
return true
}