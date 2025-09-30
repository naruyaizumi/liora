import { execSync } from "child_process";
import os from "os";
import fs from "fs";

function formatSize(bytes) {
    if (!bytes || isNaN(bytes)) return "0 B";
    let units = ["B", "KB", "MB", "GB", "TB"];
    let i = 0;
    while (bytes >= 1024 && i < units.length - 1) {
        bytes /= 1024;
        i++;
    }
    return `${bytes.toFixed(2)} ${units[i]}`;
}

function clockString(ms) {
    if (isNaN(ms) || ms < 0) return "--";
    let d = Math.floor(ms / 86400000);
    let h = Math.floor((ms / 3600000) % 24);
    let m = Math.floor((ms / 60000) % 60);
    let s = Math.floor((ms / 1000) % 60);
    let result = "";
    if (d) result += `${d}d `;
    if (h || d) result += `${h}h `;
    if (m || h || d) result += `${m}m `;
    result += `${s}s`;
    return result;
}

function getUptimeInfo() {
    let botUptime = clockString(process.uptime() * 1000);
    let vpsUptime = clockString(os.uptime() * 1000);
    return { botUptime, vpsUptime };
}

function getOSPrettyName() {
    try {
        let lines = fs.readFileSync("/etc/os-release").toString().split("\n");
        let info = lines.reduce((acc, line) => {
            let [key, val] = line.split("=");
            if (key && val) acc[key.trim()] = val.replace(/"/g, "");
            return acc;
        }, {});
        return info["PRETTY_NAME"] || os.platform();
    } catch {
        return os.platform();
    }
}

function getCPUInfo() {
    const cpus = os.cpus();
    const model = cpus[0]?.model || "Unknown";
    const cores = cpus.length;
    return { model, cores };
}

function getRAMInfo() {
    try {
        let meminfo = fs
            .readFileSync("/proc/meminfo")
            .toString()
            .split("\n")
            .reduce((acc, line) => {
                let [key, value] = line.split(":");
                if (key && value) acc[key.trim()] = parseInt(value.trim());
                return acc;
            }, {});
        let ramUsed = meminfo["MemTotal"] - meminfo["MemAvailable"];
        let swapUsed = meminfo["SwapTotal"] - meminfo["SwapFree"];
        let totalUsed = ramUsed + swapUsed;
        let totalMemory = meminfo["MemTotal"] + meminfo["SwapTotal"];
        return {
            ramUsed: ramUsed * 1024,
            totalUsed: totalUsed * 1024,
            totalMemory: totalMemory * 1024,
        };
    } catch {
        return { ramUsed: 0, totalUsed: 0, totalMemory: 0 };
    }
}

function getDiskUsage() {
    try {
        let output = execSync("df -k --output=size,used,target /").toString().trim().split("\n")[1];
        let parts = output.trim().split(/\s+/);
        let size = parseInt(parts[0]) * 1024;
        let used = parseInt(parts[1]) * 1024;
        return { used, total: size };
    } catch {
        return { used: 0, total: 0 };
    }
}

function makeBar(used, total, length = 10) {
    const ratio = total ? Math.min(1, Math.max(0, used / total)) : 0;
    const filled = Math.round(ratio * length);
    const empty = length - filled;
    const pct = (ratio * 100).toFixed(2);
    return `*[${"█".repeat(filled)}${"░".repeat(empty)}] ${pct}%*`;
}

let handler = async (m, { conn }) => {
    let vcard = `BEGIN:VCARD
VERSION:3.0
N:;ttname;;;
FN:ttname
item1.TEL;waid=13135550002:+1 (313) 555-0002
item1.X-ABLabel:Ponsel
END:VCARD`;
    let q = {
        key: {
            fromMe: false,
            participant: "13135550002@s.whatsapp.net",
            remoteJid: "status@broadcast",
        },
        message: {
            contactMessage: {
                displayName: "𝗣𝗜𝗡𝗚 𝗣𝗢𝗡𝗚",
                vcard,
            },
        },
    };
    let uptime = getUptimeInfo();
    let cpu = getCPUInfo();
    let osName = getOSPrettyName();
    let startTime = performance.now();
    let ram = getRAMInfo();
    let disk = getDiskUsage();
    let ramBar = makeBar(ram.totalUsed, ram.totalMemory);
    let diskBar = makeBar(disk.used, disk.total);
    let ramUsedStr = formatSize(ram.totalUsed);
    let ramTotalStr = formatSize(ram.totalMemory);
    let diskUsedStr = formatSize(disk.used);
    let diskTotalStr = formatSize(disk.total);
    let endTime = performance.now();
    let responseTime = (endTime - startTime).toFixed(2);
    let message = `🌟 *\`LAPORAN SERVER\`*
🚀 *Waktu Response: ${responseTime} ms*
⏰ *Uptime Bot: ${uptime.botUptime}*
📡 *Uptime VPS: ${uptime.vpsUptime}*
━━━━━━━━━━━━━━━━━━━━
💻 *\`INFORMASI SERVER\`*
🐧 *OS: ${osName}*
🖥️ *Platform: ${os.platform()} (${os.arch()})*
📜 *Kernel: ${os.release()}*
🧠 *CPU: ${cpu.model} (${cpu.cores} Core)*
🗳️ *RAM: ${ramUsedStr} / ${ramTotalStr}*
${ramBar}
🔥 *Disk: ${diskUsedStr} / ${diskTotalStr}*
${diskBar}
━━━━━━━━━━━━━━━━━━━━`;
    await conn.sendMessage(
        m.chat,
        {
            text: message,
            contextInfo: {
                externalAdReply: {
                    title: "🍙 Status Sistem Real-Time",
                    body: "🍣 Monitoring otomatis oleh bot 🍵",
                    thumbnailUrl: "https://qu.ax/WrrrT.jpg",
                    mediaType: 1,
                    renderLargerThumbnail: true,
                },
            },
        },
        { quoted: q }
    );
};

handler.help = ["ping"];
handler.tags = ["info"];
handler.command = /^(ping)$/i;
handler.owner = true;

export default handler;
