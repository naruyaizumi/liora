let handler = async (m, { conn, text }) => {
if (!text) return m.reply(`🌍 *Masukkan nilai pergeseran bumi*\n*(dalam km, + menjauh/- mendekat dari matahari)*\n\n*Contoh: .geserbumi 5000*`)
const shiftValue = parseFloat(text)
if (isNaN(shiftValue)) return m.reply('❌ *Input harus angka!*\n*Contoh: `.geserbumi -3000` (mendekat 3000km)*')

const {
newDistance,
orbitalPeriod,
orbitStability,
temperatureChange,
seasonEffects,
gravityEffects,
warnings
} = earthShiftSimulation(shiftValue)

let resultMessage = `
🌎 *SIMULASI PERGESERAN BUMI* 🌎
▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬

🪐 *Parameter Input:*
⬆️ *Pergeseran:* ${Math.abs(shiftValue).toLocaleString()} km
🔄 *Arah:* ${shiftValue > 0 ? 'Menjauh dari Matahari' : 'Mendekati Matahari'}

☀️ *Dampak Orbital:*
├ ${newDistance}
├ ${orbitalPeriod}
└ ${orbitStability}

🌡️ *Perubahan Iklim:*
├ ${temperatureChange}
├ ${seasonEffects}
└ ${gravityEffects}
`.trim()

if (warnings.length > 0) {
resultMessage += `\n\n⚠️ *PERINGATAN KRITIS:* ⚠️\n` + warnings.map(w => `▸ ${w}`).join('\n')
}

await conn.sendMessage(m.chat, {
text: resultMessage
}, { quoted: m })
}

function earthShiftSimulation(shiftKm) {
const CURRENT_DISTANCE_KM = 149600000
const HABITABLE_ZONE_MIN = 147100000
const HABITABLE_ZONE_MAX = 152100000

const newDistanceKm = CURRENT_DISTANCE_KM + shiftKm
const newOrbitDays = 365.25 * Math.pow(newDistanceKm / CURRENT_DISTANCE_KM, 1.5)
const tempChange = (1 - Math.pow(CURRENT_DISTANCE_KM / newDistanceKm, 2)) * 100
const seasonVariation = Math.abs(shiftKm / 1000000) * 100
const gravityChange = shiftKm > 0 ? -0.0001 * shiftKm : 0.00005 * Math.abs(shiftKm)

let stabilityStatus
if (newDistanceKm < HABITABLE_ZONE_MIN) stabilityStatus = '🔴 *Tidak Stabil!* (Zona terlalu panas)'
else if (newDistanceKm > HABITABLE_ZONE_MAX) stabilityStatus = '🔴 *Tidak Stabil!* (Zona terlalu dingin)'
else stabilityStatus = '🟢 *Stabil* (Dalam zona layak huni)'

const warnings = []
if (newDistanceKm < HABITABLE_ZONE_MIN) warnings.push('*Bumi terlalu panas!* Lautan akan menguap')
if (newDistanceKm > HABITABLE_ZONE_MAX) warnings.push('*Bumi terlalu dingin!* Zaman es global')
if (Math.abs(shiftKm) > 5000000) warnings.push('*Perubahan ekstrim!* Kehidupan terancam')

return {
newDistance: `🌞 *Jarak Baru:* ${(newDistanceKm/1000000).toFixed(2)} juta km`,
orbitalPeriod: `⏱ *Tahun Baru:* ${newOrbitDays.toFixed(1)} hari`,
orbitStability: `⚖️ *Stabilitas:* ${stabilityStatus}`,
temperatureChange: `🌡 *Perubahan Suhu:* ${tempChange.toFixed(2)}%`,
seasonEffects: `🍂 *Variasi Musim:* ${seasonVariation.toFixed(1)}% lebih ekstrim`,
gravityEffects: `🪐 *Perubahan Gravitasi:* ${gravityChange.toFixed(4)}g`,
warnings
}
}

handler.help = ['geserbumi']
handler.tags = ['fun']
handler.command = /^(geserbumi|earthshift|simbumi)$/i
handler.limit = true
handler.register = true

export default handler