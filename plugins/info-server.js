import os from "os"
import { execSync } from "child_process"

let handler = async (m) => {
try {
await global.loading(m, conn)
let osInfo = os.platform()
let totalRAM = Math.floor(os.totalmem() / (1024 * 1024))
let freeRAM = Math.floor(os.freemem() / (1024 * 1024))
let cpuModel = os.cpus()[0].model
let cpuCores = os.cpus().length
let arch = os.arch()
let hostname = os.hostname()
let uptime = formatUptime(os.uptime())
let diskUsage = getDiskUsage()
let serverMessage = `
🖥️ *\`SPESIFIKASI SERVER\`*
💻 *OS: ${osInfo}*
📡 *Architecture: ${arch}*
🏠 *Hostname: ${hostname}*
⏳ *Uptime: ${uptime}*
━━━━━━━━━━━━━━━━━━━━
🛠️ *\`HARDWARE INFORMATION\`*
🔥 *Processor: ${cpuModel}*
🧵 *CPU Cores: ${cpuCores}*
💾 *RAM: ${freeRAM} MB / ${totalRAM} MB*
━━━━━━━━━━━━━━━━━━━━
📂 *\`DISK INFORMATION\`*
📀 *Total Disk: ${diskUsage.total} GB*
📊 *Used Disk: ${diskUsage.used} GB*
🗄️ *Free Disk: ${diskUsage.free} GB*
━━━━━━━━━━━━━━━━━━━━`
await conn.sendMessage(m.chat, {
text: serverMessage
}, { quoted: m })
} finally {
await global.loading(m, conn, true)
}
}
handler.help = ["server"]
handler.tags = ["info"]
handler.command = /^(server)$/i
handler.owner = true

export default handler

function formatUptime(uptime) {
let d = Math.floor(uptime / (60 * 60 * 24))
let h = Math.floor((uptime / (60 * 60)) % 24)
let m = Math.floor((uptime / 60) % 60)
let s = Math.floor(uptime % 60)

return `${d} hari, ${h} jam, ${m} menit, ${s} detik`
}

function getDiskUsage() {
try {
let diskData = execSync("df -h --output=size,used,avail /").toString().split("\n")[1].trim().split(/\s+/)
return {
total: diskData[0],
used: diskData[1],
free: diskData[2]
}
} catch (e) {
return { total: "Unknown", used: "Unknown", free: "Unknown" }
}
}