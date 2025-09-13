import { execSync } from 'child_process'
import { cpus as _cpus, totalmem, freemem } from 'os'
import os from 'os'

function formatSize(bytes) {
if (!bytes || isNaN(bytes)) return '0 B'
let units = ['B', 'KB', 'MB', 'GB', 'TB']
let i = 0
while (bytes >= 1024 && i < units.length - 1) {
bytes /= 1024
i++
}
return `${bytes.toFixed(2)} ${units[i]}`
}

function clockString(ms) {
if (isNaN(ms) || ms < 0) return '--'
let d = Math.floor(ms / 86400000)
let h = Math.floor((ms / 3600000) % 24)
let m = Math.floor((ms / 60000) % 60)
let s = Math.floor((ms / 1000) % 60)
let result = ''
if (d) result += `${d}d `
if (h || d) result += `${h}h `
if (m || h || d) result += `${m}m `
result += `${s}s`
return result
}

function getUptimeInfo() {
let botUptime = clockString(process.uptime() * 1000)
let vpsUptime = clockString(os.uptime() * 1000)
return { botUptime, vpsUptime }
}

function getOSPrettyName() {
try {
let lines = execSync('cat /etc/os-release').toString().split('\n')
let info = lines.reduce((acc, line) => {
let [key, val] = line.split('=')
if (key && val) acc[key.trim()] = val.replace(/"/g, '')
return acc
}, {})
return info['PRETTY_NAME'] || os.platform()
} catch {
return os.platform()
}
}

function getCPUInfo() {
const cpus = os.cpus()
const model = cpus[0]?.model || 'Unknown'
const cores = cpus.length
const speed = cpus[0]?.speed || 0
return {
model,
cores,
}
}

function getRAMInfo() {
try {
let meminfo = execSync('cat /proc/meminfo').toString().split('\n').reduce((acc, line) => {
let [key, value] = line.split(':')
if (key && value) acc[key.trim()] = parseInt(value.trim())
return acc
}, {})
let ramUsed = meminfo['MemTotal'] - meminfo['MemAvailable']
let swapUsed = meminfo['SwapTotal'] - meminfo['SwapFree']
let totalUsed = ramUsed + swapUsed
let totalMemory = meminfo['MemTotal'] + meminfo['SwapTotal']
let totalFree = meminfo['MemAvailable'] + meminfo['SwapFree']
return {
ramUsed: ramUsed * 1024,
swapUsed: swapUsed * 1024,
totalUsed: totalUsed * 1024,
totalMemory: totalMemory * 1024,
totalFree: totalFree * 1024
}
} catch {
return {
ramUsed: 0,
swapUsed: 0,
totalUsed: 0,
totalMemory: 0,
totalFree: 0
}
}
}

function getDiskUsage() {
try {
let output = execSync('df -k --output=source,size,used,avail,pcent,target').toString().trim().split('\n').slice(1)
let rootLine = output.find(line => line.endsWith(' /'))
let volumeLine = output.find(line => line.includes('/mnt/volume'))
let parseLine = (line) => {
let parts = line.trim().split(/\s+/)
return {
size: parseInt(parts[1]) * 1024,
used: parseInt(parts[2]) * 1024,
avail: parseInt(parts[3]) * 1024
}
}
let root = rootLine ? parseLine(rootLine) : { size: 0, used: 0, avail: 0 }
let volume = volumeLine ? parseLine(volumeLine) : { size: 0, used: 0, avail: 0 }
let totalSize = root.size + volume.size
let totalUsed = root.used + volume.used
let usage = ((totalUsed / totalSize) * 100).toFixed(2) + '%'
return {
used: formatSize(totalUsed),
total: formatSize(totalSize),
usage
}
} catch (err) {
console.error('Gagal mendapatkan info disk:', err.message)
return { total: '0 B', used: '0 B', usage: '0%' }
}
}

let handler = async (m, { conn }) => {
let startTime = performance.now()
let uptime = getUptimeInfo()
let cpu = getCPUInfo()
let diskInfo = getDiskUsage()
let osName = getOSPrettyName()
let ram = getRAMInfo()
let ramUsedStr = formatSize(ram.totalUsed)
let ramTotalStr = formatSize(ram.totalMemory)
let endTime = performance.now()
let responseTime = (endTime - startTime).toFixed(2)
let message = `🌟 *\`LAPORAN SERVER\`*
🚀 *Waktu Response: ${responseTime} ms*
⏰ *Waktu Aktif Bot: ${uptime.botUptime}*
📡 *Waktu Aktif VPS: ${uptime.vpsUptime}*
━━━━━━━━━━━━━━━━━━━━
💻 *\`INFORMASI SERVER\`*
🐧 *OS: ${osName}*
🖥️ *Platform: ${os.platform()} (${os.arch()})*
📜 *Karnel: ${os.release()}*
🧠 *CPU: ${cpu.model} (${cpu.cores} Core)*
🗳️️ *Penggunaan RAM:  ${ramUsedStr} / ${ramTotalStr}*
🔥 *Penggunaan Disk: ${diskInfo.used} / ${diskInfo.total} (${diskInfo.usage} digunakan)*
━━━━━━━━━━━━━━━━━━━━`
await conn.sendMessage(m.chat, {
text: message,
contextInfo: {
externalAdReply: {
title: '🍙 Status Sistem Real-Time',
body: '🍣 Monitoring otomatis oleh bot 🍵',
thumbnailUrl: 'https://cloudkuimages.guru/uploads/images/7nuXYWCz.jpg',
mediaType: 1,
renderLargerThumbnail: true
}
}
})
}

handler.help = ['ping']
handler.tags = ['info']
handler.command = /^(ping|speed)$/i
handler.owner = true

export default handler