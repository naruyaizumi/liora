
let handler = async (m, { conn, text, usedPrefix, command }) => {
if (!text) return m.reply(`🍩 *Contoh: ${usedPrefix + command} 100000 usd*`)
let [jumlah, mataUang] = text.trim().split(/\s+/)
if (!jumlah || !mataUang || isNaN(jumlah)) return m.reply(`🍧 *Format salah!*\n*Gunakan: ${usedPrefix + command} 100000 usd*`)
await global.loading(m, conn)
try {
let res = await fetch('https://open.er-api.com/v6/latest/USD')
let json = await res.json()
if (!json || !json.rates) throw 'Gagal ambil data kurs'
let baseRates = json.rates
let tanggalUpdate = new Date(json.time_last_update_unix * 1000).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })
mataUang = mataUang.toUpperCase()
jumlah = parseFloat(jumlah)
if (!baseRates[mataUang]) return m.reply('❌ *Mata uang tidak dikenali.*')
let hasil = `🍓 *Konversi ${jumlah.toLocaleString('id-ID')} ${mataUang}* 🍓\n📅 *Update Terakhir: ${tanggalUpdate}*\n━━━━━━━━━━━━━━━━━━━\n`
let nilaiUSD = jumlah / baseRates[mataUang]
let flags = {
AED: '🇦🇪', AFN: '🇦🇫', ALL: '🇦🇱', AMD: '🇦🇲', ANG: '🇳🇱',
AOA: '🇦🇴', ARS: '🇦🇷', AUD: '🇦🇺', AWG: '🇦🇼', AZN: '🇦🇿',
BAM: '🇧🇦', BBD: '🇧🇧', BDT: '🇧🇩', BGN: '🇧🇬', BHD: '🇧🇭',
BIF: '🇧🇮', BMD: '🇧🇲', BND: '🇧🇳', BOB: '🇧🇴', BRL: '🇧🇷',
BSD: '🇧🇸', BTN: '🇧🇹', BWP: '🇧🇼', BYN: '🇧🇾', BZD: '🇧🇿',
CAD: '🇨🇦', CDF: '🇨🇩', CHF: '🇨🇭', CLP: '🇨🇱', CNY: '🇨🇳',
COP: '🇨🇴', CRC: '🇨🇷', CUP: '🇨🇺', CVE: '🇨🇻', CZK: '🇨🇿',
DJF: '🇩🇯', DKK: '🇩🇰', DOP: '🇩🇴', DZD: '🇩🇿', EGP: '🇪🇬',
ERN: '🇪🇷', ETB: '🇪🇹', EUR: '🇪🇺', FJD: '🇫🇯', FKP: '🇫🇰',
FOK: '🇫🇴', GBP: '🇬🇧', GEL: '🇬🇪', GGP: '🇬🇬', GHS: '🇬🇭',
GIP: '🇬🇮', GMD: '🇬🇲', GNF: '🇬🇳', GTQ: '🇬🇹', GYD: '🇬🇾',
HKD: '🇭🇰', HNL: '🇭🇳', HRK: '🇭🇷', HTG: '🇭🇹', HUF: '🇭🇺',
IDR: '🇮🇩', ILS: '🇮🇱', IMP: '🇮🇲', INR: '🇮🇳', IQD: '🇮🇶',
IRR: '🇮🇷', ISK: '🇮🇸', JEP: '🇯🇪', JMD: '🇯🇲', JOD: '🇯🇴',
JPY: '🇯🇵', KES: '🇰🇪', KGS: '🇰🇬', KHR: '🇰🇭', KMF: '🇰🇲',
KRW: '🇰🇷', KWD: '🇰🇼', KYD: '🇰🇾', KZT: '🇰🇿', LAK: '🇱🇦',
LBP: '🇱🇧', LKR: '🇱🇰', LRD: '🇱🇷', LSL: '🇱🇸', LYD: '🇱🇾',
MAD: '🇲🇦', MDL: '🇲🇩', MGA: '🇲🇬', MKD: '🇲🇰', MMK: '🇲🇲',
MNT: '🇲🇳', MOP: '🇲🇴', MRO: '🇲🇷', MUR: '🇲🇺', MVR: '🇲🇻',
MWK: '🇲🇼', MXN: '🇲🇽', MYR: '🇲🇾', MZN: '🇲🇿', NAD: '🇳🇦',
NGN: '🇳🇬', NIO: '🇳🇮', NOK: '🇳🇴', NPR: '🇳🇵', NZD: '🇳🇿',
OMR: '🇴🇲', PAB: '🇵🇦', PEN: '🇵🇪', PGK: '🇵🇬', PHP: '🇵🇭',
PKR: '🇵🇰', PLN: '🇵🇱', PYG: '🇵🇾', QAR: '🇶🇦', RON: '🇷🇴',
RSD: '🇷🇸', RUB: '🇷🇺', RWF: '🇷🇼', SAR: '🇸🇦', SBD: '🇸🇧',
SCR: '🇸🇨', SDG: '🇸🇩', SEK: '🇸🇪', SGD: '🇸🇬', SHP: '🇸🇭',
SLL: '🇸🇱', SOS: '🇸🇴', SRD: '🇸🇷', SSP: '🇸🇸', STD: '🇸🇹',
SYP: '🇸🇾', SZL: '🇸🇿', THB: '🇹🇭', TJS: '🇹🇯', TMT: '🇹🇲',
TND: '🇹🇳', TOP: '🇹🇴', TRY: '🇹🇷', TTD: '🇹🇹', TWD: '🇹🇼',
TZS: '🇹🇿', UAH: '🇺🇦', UGX: '🇺🇬', USD: '🇺🇸', UYU: '🇺🇾',
UZS: '🇺🇿', VES: '🇻🇪', VND: '🇻🇳', VUV: '🇻🇺', WST: '🇼🇸',
XAF: '🇨🇲', XCD: '🇦🇮', XDR: '🌐', XOF: '🇧🇫', XPF: '🇵🇫',
YER: '🇾🇪', ZAR: '🇿🇦', ZMW: '🇿🇲', ZWL: '🇿🇼'
}
let targets = Object.keys(flags)
for (let to of targets) {
if (to === mataUang) continue
let nilai = nilaiUSD * baseRates[to]
hasil += `${flags[to]} *${to}: ${nilai.toLocaleString('id-ID', { maximumFractionDigits: 4 })}*\n`
}
hasil += '━━━━━━━━━━━━━━━━━━━'
m.reply(hasil)
} catch (e) {
console.error(e)
m.reply('❌ *Gagal konversi mata uang. Coba lagi nanti* 🍬')
} finally {
await global.loading(m, conn, true)
}
}

handler.help = ['matauang']
handler.tags = ['tools']
handler.command = /^(currency|kurs|matauang|konversi)$/i
handler.limit = true
handler.register = true

export default handler