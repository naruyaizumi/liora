import os from "os"
import { execSync } from "child_process"

let handler = async (m, { conn }) => {
let botUptime = process.uptime()
let serverUptime = os.uptime()
let waktu = getDateInfo()
let botTime = formatReadableTime(botUptime)
let serverTime = formatReadableTime(serverUptime)
let bandwidth = getBandwidthUsage()
let message = `
🖥️ *\`INFO SERVER & BOT\`*
🌥️ *Tanggal: ${waktu.namaHari}, ${waktu.tanggal} ${waktu.namaBulan} ${waktu.tahun}*
⏰ *Jam: ${waktu.jam}:${waktu.menit} WIB*
━━━━━━━━━━━━━━━━━━━━
🚀 *Uptime Bot: ${botTime}*
🖥️ *Uptime Server: ${serverTime}*
📤 *Upload: ${bandwidth.upload} MB*
📥 *Download: ${bandwidth.download} MB*
━━━━━━━━━━━━━━━━━━━━`
await conn.sendMessage(m.chat, {
text: message
})
}

handler.help = ["runtime"]
handler.tags = ["info"]
handler.command = /^(runtime|rt)$/i
handler.owner = true

export default handler

function getDateInfo() {
let hari = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"]
let bulan = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"]
let sekarang = new Date()
let jakarta = new Date(sekarang.toLocaleString("en-US", { timeZone: "Asia/Jakarta" }))

return {
namaHari: hari[jakarta.getDay()],
tanggal: jakarta.getDate(),
namaBulan: bulan[jakarta.getMonth()],
tahun: jakarta.getFullYear(),
jam: String(jakarta.getHours()).padStart(2, "0"),
menit: String(jakarta.getMinutes()).padStart(2, "0")
}
}

function formatReadableTime(seconds) {
let d = Math.floor(seconds / 86400)
let h = Math.floor((seconds % 86400) / 3600)
let m = Math.floor((seconds % 3600) / 60)
let s = Math.floor(seconds % 60)

let parts = []
if (d) parts.push(`${d} hari`)
if (h) parts.push(`${h} jam`)
if (m) parts.push(`${m} menit`)
if (s || parts.length === 0) parts.push(`${s} detik`)
return parts.join(" ")
}

function getBandwidthUsage() {
try {
let output = execSync("cat /proc/net/dev").toString()
let lines = output.split("\n").slice(2)
let totalDownload = 0, totalUpload = 0

lines.forEach(line => {
let data = line.trim().split(/\s+/)
if (data.length > 9) {
totalDownload += parseInt(data[1])
totalUpload += parseInt(data[9])
}
})
return {
download: (totalDownload / (1024 * 1024)).toFixed(2),
upload: (totalUpload / (1024 * 1024)).toFixed(2)
}
} catch {
return { download: "Unknown", upload: "Unknown" }
}
}