
let handler = async (m, { conn, text }) => {
if (!text) return m.reply(`🍰 *Masukkan nilai pergeseran bulan*\n*(dalam meter, + untuk menjauh/- untuk mendekat)*\n\n*Contoh: .geserbulan 1000*`)
const shiftValue = parseFloat(text)
if (isNaN(shiftValue)) return m.reply('🍭 *Input harus berupa angka!*\n*Contoh: `.geserbulan -500` (mendekat 500m)*')
const {
newDistance,
orbitalPeriod,
orbitStability,
gravityChange,
tidalEffects,
earthRotation,
warnings
} = lunarShiftSimulation(shiftValue)

let resultMessage = `
🍡 *SIMULASI PERGESERAN BULAN* 🍡
▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬
🍬 *Parameter Input:*
🍓 *Pergeseran: ${Math.abs(shiftValue).toLocaleString()} meter*
🍪 *Arah: ${shiftValue > 0 ? 'Menjauh dari Bumi' : 'Mendekati Bumi'}*

🍩 *Dampak Orbital:*
🍫 *${newDistance}*
🍰 *${orbitalPeriod}*
🍮 *${orbitStability}*

🧁 *Perubahan Fisik:*
🍦 *${gravityChange}*
🥧 *${tidalEffects}*
🍯 *${earthRotation}*
`.trim()
if (warnings.length > 0) {
resultMessage += `\n\n🍨 *PERINGATAN KRITIS:* 🍨\n` +
warnings.map(w => `🍬 ${w}`).join('\n')
}
await m.reply(resultMessage)
}

function lunarShiftSimulation(shiftMeters) {
const CURRENT_DISTANCE_KM = 384400
const HILL_SPHERE_RATIO = 0.5
const CRITICAL_DISTANCE_KM = 10000

const shiftKm = shiftMeters / 1000
const newDistanceKm = CURRENT_DISTANCE_KM + shiftKm
const newDistanceM = newDistanceKm * 1000

const newOrbitDays = 27.322 * Math.pow(newDistanceKm / CURRENT_DISTANCE_KM, 1.5)
const gravityChangePercent = Math.pow(CURRENT_DISTANCE_KM / newDistanceKm, 2) * 100 - 100
const tidalFactor = Math.pow(CURRENT_DISTANCE_KM / newDistanceKm, 3)
const dayLengthChange = 24 * (newDistanceKm / CURRENT_DISTANCE_KM)

let stabilityStatus
if (Math.abs(shiftKm) < 1) {
stabilityStatus = '🍏 *Stabil (Perubahan minor)*'
} else if (newDistanceKm > CRITICAL_DISTANCE_KM * 5) {
stabilityStatus = '🍒 *Tidak Stabil! (Risiko lepas orbit)*'
} else {
stabilityStatus = '🍎 *Stabil Bersyarat*'
}
const warnings = []
if (newDistanceKm < CRITICAL_DISTANCE_KM) {
warnings.push('*Bulan terlalu dekat! Ancaman tsunami global*')
}
if (newDistanceKm > CURRENT_DISTANCE_KM * 2) {
warnings.push('*Bulan terlalu jauh! Musim akan kacau*')
}
if (Math.abs(shiftMeters) > 1000000) {
warnings.push('*Perubahan drastis! Sistem Bumi-Bulan dalam bahaya*')
}

return {
newDistance: `🍪 *Jarak Baru: ${newDistanceKm.toLocaleString()} km*`,
orbitalPeriod: `🧁 *Periode Orbit: ${newOrbitDays.toFixed(3)} hari*`,
orbitStability: `🍬 *Stabilitas: ${stabilityStatus}*`,
gravityChange: `🍫 *Perubahan Gravitasi: ${gravityChangePercent.toFixed(2)}%*`,
tidalEffects: `🍩 *Efek Pasang Surut: ${tidalFactor.toFixed(2)}x ${tidalFactor > 1 ? 'lebih kuat' : 'lebih lemah'}*`,
earthRotation: `🍰 *Durasi Hari: ${dayLengthChange.toFixed(3)} jam*`,
warnings
}
}

handler.help = ['geserbulan']
handler.tags = ['tool']
handler.command = /^(geserbulan|moonshift|simulasibulan)$/i
handler.limit = true
handler.register = true

export default handler