import os from "os";

function formatSize(bytes) {
    if (!bytes || isNaN(bytes)) return "0 B";
    const units = ["B", "KB", "MB", "GB", "TB"];
    let i = 0;
    while (bytes >= 1024 && i < units.length - 1) {
        bytes /= 1024;
        i++;
    }
    return `${bytes.toFixed(2)} ${units[i]}`;
}

function formatTime(sec) {
    const m = Math.floor(sec / 60);
    const h = Math.floor(m / 60);
    const d = Math.floor(h / 24);
    return (
        [d && `${d}d`, h % 24 && `${h % 24}h`, m % 60 && `${m % 60}m`].filter(Boolean).join(" ") ||
        "0m"
    );
}

async function getOSPrettyName() {
    try {
        const file = Bun.file("/etc/os-release");
        const text = await file.text();
        const info = Object.fromEntries(
            text
                .split("\n")
                .map((line) => line.split("="))
                .filter(([key, val]) => key && val)
                .map(([key, val]) => [key.trim(), val.replace(/"/g, "")])
        );
        return {
            pretty: info["PRETTY_NAME"] || os.platform(),
            id: info["ID"] || "unknown",
            version: info["VERSION_ID"] || "unknown",
        };
    } catch {
        return {
            pretty: os.platform(),
            id: "unknown",
            version: "unknown",
        };
    }
}

function getCPUInfo() {
    const cpus = os.cpus();
    const load = os.loadavg();
    const cores = cpus.length;

    function loadPercent(loadAvg) {
        return ((loadAvg / cores) * 100).toFixed(2);
    }

    return {
        model: cpus[0]?.model || "Unknown",
        cores,
        speed: cpus[0]?.speed || 0,
        load1: load[0].toFixed(2),
        load5: load[1].toFixed(2),
        load15: load[2].toFixed(2),
        load1Pct: loadPercent(load[0]),
        load5Pct: loadPercent(load[1]),
        load15Pct: loadPercent(load[2]),
    };
}

function getCPUUsageSinceBoot() {
    try {
        const result = Bun.spawnSync({
            cmd: [
                "sh",
                "-c",
                "awk '/^cpu /{idle=$5; total=0; for(i=2;i<=NF;i++) total+=$i} END{print (total-idle)*100/total}' /proc/stat",
            ],
            stdout: "pipe",
        });
        const usage = parseFloat(new TextDecoder().decode(result.stdout).trim());
        return isNaN(usage) ? 0 : usage.toFixed(2);
    } catch {
        return 0;
    }
}

async function getRAMInfo() {
    try {
        const text = await Bun.file("/proc/meminfo").text();
        const meminfo = text.split("\n").reduce((acc, line) => {
            const [key, value] = line.split(":");
            if (key && value) acc[key.trim()] = parseInt(value.trim());
            return acc;
        }, {});
        const ramTotal = meminfo["MemTotal"] * 1024;
        const ramFree = meminfo["MemFree"] * 1024;
        const ramAvailable = meminfo["MemAvailable"] * 1024;
        const ramUsed = ramTotal - ramAvailable;
        const ramBuffers = meminfo["Buffers"] * 1024;
        const ramCached = meminfo["Cached"] * 1024;
        const swapTotal = meminfo["SwapTotal"] * 1024;
        const swapFree = meminfo["SwapFree"] * 1024;
        const swapUsed = swapTotal - swapFree;
        const totalUsed = ramUsed + swapUsed;
        const totalMemory = ramTotal + swapTotal;
        
        return {
            ramUsed,
            ramTotal,
            ramFree,
            ramAvailable,
            ramBuffers,
            ramCached,
            swapUsed,
            swapTotal,
            totalUsed,
            totalMemory,
        };
    } catch {
        return {
            ramUsed: 0,
            ramTotal: 0,
            ramFree: 0,
            ramAvailable: 0,
            ramBuffers: 0,
            ramCached: 0,
            swapUsed: 0,
            swapTotal: 0,
            totalUsed: 0,
            totalMemory: 0,
        };
    }
}

function getDiskUsage() {
    try {
        const result = Bun.spawnSync({
            cmd: ["df", "-k", "--output=size,used,avail,pcent,target", "/"],
            stdout: "pipe",
        });
        const output = new TextDecoder().decode(result.stdout).trim().split("\n")[1];
        const parts = output.trim().split(/\s+/);
        const size = parseInt(parts[0]) * 1024;
        const used = parseInt(parts[1]) * 1024;
        const avail = parseInt(parts[2]) * 1024;
        return { used, total: size, available: avail };
    } catch {
        return { used: 0, total: 0, available: 0 };
    }
}

async function getInodeUsage() {
    try {
        const result = Bun.spawnSync({
            cmd: ["df", "-i", "/"],
            stdout: "pipe",
        });
        const lines = new TextDecoder().decode(result.stdout).trim().split("\n");
        if (lines.length > 1) {
            const parts = lines[1].trim().split(/\s+/);
            return {
                total: parseInt(parts[1]) || 0,
                used: parseInt(parts[2]) || 0,
                available: parseInt(parts[3]) || 0,
            };
        }
    } catch {}
    return { total: 0, used: 0, available: 0 };
}

function getHeapInfo() {
    const mem = process.memoryUsage();
    return {
        heapUsed: mem.heapUsed,
        heapTotal: mem.heapTotal,
        rss: mem.rss,
        external: mem.external,
        arrayBuffers: mem.arrayBuffers || 0,
    };
}

function getProcessInfo() {
    return {
        pid: process.pid,
        ppid: process.ppid || "N/A",
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch,
    };
}

async function getNetworkStats() {
    try {
        const text = await Bun.file("/proc/net/dev").text();
        const lines = text.split("\n").slice(2);
        let totalRx = 0, totalTx = 0;
        
        for (const line of lines) {
            if (!line.trim()) continue;
            const parts = line.trim().split(/\s+/);
            if (parts[0].includes("lo:")) continue; // skip loopback
            totalRx += parseInt(parts[1]) || 0;
            totalTx += parseInt(parts[9]) || 0;
        }
        
        return { rx: totalRx, tx: totalTx };
    } catch {
        return { rx: 0, tx: 0 };
    }
}

function getWarnings(cpu, ram, disk, inodes, heap) {
    const warnings = [];
    const cpuLoad1Pct = parseFloat(cpu.load1Pct);
    if (cpuLoad1Pct > 90) {
        warnings.push("⚠︎ CRITICAL: Very high CPU load (>90%) - System overload!");
    } else if (cpuLoad1Pct > 70) {
        warnings.push("⚠︎ WARNING: High CPU load (>70%) - Performance degradation");
    }
    const ramUsagePct = (ram.totalUsed / ram.totalMemory) * 100;
    if (ramUsagePct > 90) {
        warnings.push("⚠︎ CRITICAL: Memory is almost full (>90%) - Risk of OOM killer!");
    } else if (ramUsagePct > 80) {
        warnings.push("⚠︎ WARNING: Memory usage tinggi (>80%) - Pertimbangkan cleanup");
    }
    if (ram.swapTotal > 0) {
        const swapUsagePct = (ram.swapUsed / ram.swapTotal) * 100;
        if (swapUsagePct > 50) {
            warnings.push("⚠︎ WARNING: High swap usage (>50%) - Memory pressure detected");
        }
    }
    const diskUsagePct = (disk.used / disk.total) * 100;
    if (diskUsagePct > 90) {
        warnings.push("⚠︎ CRITICAL: Disk space is almost full (>90%) - Cleanup now!");
    } else if (diskUsagePct > 80) {
        warnings.push("⚠︎ WARNING: Limited disk space (>80%) - Schedule a cleanup");
    }
    if (inodes.total > 0) {
        const inodeUsagePct = (inodes.used / inodes.total) * 100;
        if (inodeUsagePct > 90) {
            warnings.push("⚠︎ CRITICAL: Inodes running low (>90%) - Delete small files!");
        } else if (inodeUsagePct > 80) {
            warnings.push("⚠︎ WARNING: High inode usage (>80%) - Too many files");
        }
    }
    const rssSize = heap.rss;
    const ramAvailable = ram.ramAvailable;
    if (rssSize > 500 * 1024 * 1024) {
        warnings.push("⚠︎ WARNING: Bot memory usage is very high (>500MB) - Possible leak");
    }
    if (ramAvailable > 0) {
        const rssPctOfAvailable = (rssSize / ram.ramTotal) * 100;
        if (rssPctOfAvailable > 20) {
            warnings.push("⚠︎ INFO: Bot using >20% total RAM - Growth monitor");
        }
    }
    if (heap.external > 200 * 1024 * 1024) {
        warnings.push("⚠︎ INFO: High external memory (>200MB) - Lots of external buffers/data");
    }
    
    return warnings;
}

function makeBar(used, total, length = 10) {
    const ratio = total ? Math.min(1, Math.max(0, used / total)) : 0;
    const filled = Math.round(ratio * length);
    const empty = length - filled;
    const pct = (ratio * 100).toFixed(1);
    let indicator = "✓";
    if (ratio > 0.9) indicator = "✗";
    else if (ratio > 0.8) indicator = "⚠";
    return `[${"█".repeat(filled)}${"░".repeat(empty)}] ${pct}% ${indicator}`;
}

let handler = async (m, { conn }) => {
    const osInfo = await getOSPrettyName();
    const cpu = getCPUInfo();
    const cpuBootUsage = getCPUUsageSinceBoot();
    const ram = await getRAMInfo();
    const disk = getDiskUsage();
    const inodes = await getInodeUsage();
    const heap = getHeapInfo();
    const proc = getProcessInfo();
    const network = await getNetworkStats();
    const bunVersion = Bun.version;
    const ramBar = makeBar(ram.totalUsed, ram.totalMemory);
    const ramOnlyBar = makeBar(ram.ramUsed, ram.ramTotal);
    const swapBar = ram.swapTotal > 0 ? makeBar(ram.swapUsed, ram.swapTotal) : "N/A";
    const diskBar = makeBar(disk.used, disk.total);
    const inodeBar = inodes.total > 0 ? makeBar(inodes.used, inodes.total) : "N/A";
    const heapBar = makeBar(heap.rss, ram.ramTotal);
    const uptimeBot = formatTime(process.uptime());
    const uptimeSys = formatTime(os.uptime());
    
    const warnings = getWarnings(cpu, ram, disk, inodes, heap);
    const warningSection = warnings.length > 0 
        ? `\n────────────────────────────\nSYSTEM WARNINGS\n${warnings.join("\n")}\n`
        : "";
    
    const message = `
\`\`\`
━━━ SYSTEM INFORMATION ━━━
OS: ${osInfo.pretty}
Distribution: ${osInfo.id} ${osInfo.version}
Kernel: ${os.release()}
Platform: ${os.platform()} (${os.arch()})
Hostname: ${os.hostname()}
System Uptime: ${uptimeSys}

━━━ SOFTWARE VERSIONS ━━━
Bun Runtime: v${bunVersion}
Node.js API: ${proc.nodeVersion}
Process ID: ${proc.pid}
Parent PID: ${proc.ppid}
Bot Uptime: ${uptimeBot}

━━━ CPU INFORMATION ━━━
Model: ${cpu.model}
Cores: ${cpu.cores} @ ${cpu.speed} MHz
Architecture: ${os.arch()}
Load Average:
1 min: ${cpu.load1} (${cpu.load1Pct}% of capacity)
5 min: ${cpu.load5} (${cpu.load5Pct}% of capacity)
15 min: ${cpu.load15} (${cpu.load15Pct}% of capacity)
Usage Since Boot: ${cpuBootUsage}%

━━━ MEMORY INFORMATION ━━━
Physical RAM:
Used: ${formatSize(ram.ramUsed)} / ${formatSize(ram.ramTotal)}
${ramOnlyBar}
Available: ${formatSize(ram.ramAvailable)}
Buffers: ${formatSize(ram.ramBuffers)}
Cached: ${formatSize(ram.ramCached)}
Swap Memory:
Used: ${formatSize(ram.swapUsed)} / ${formatSize(ram.swapTotal)}
${swapBar}
Total (RAM + Swap):
${formatSize(ram.totalUsed)} / ${formatSize(ram.totalMemory)}
${ramBar}

━━━ PROCESS MEMORY (Bot) ━━━
RSS (Total Memory): ${formatSize(heap.rss)}
Heap Used: ${formatSize(heap.heapUsed)}
Heap Total: ${formatSize(heap.heapTotal)}
${heapBar}
External: ${formatSize(heap.external)}
Array Buffers: ${formatSize(heap.arrayBuffers)}
Memory Efficiency: ${((heap.heapUsed / heap.rss) * 100).toFixed(1)}% heap of total RSS

━━━ DISK INFORMATION ━━━
Root Filesystem (/):
Used: ${formatSize(disk.used)} / ${formatSize(disk.total)}
${diskBar}
Available: ${formatSize(disk.available)}
Inodes:
Used: ${inodes.used.toLocaleString()} / ${inodes.total.toLocaleString()}
${inodeBar}

━━━ NETWORK STATISTICS ━━━
Total RX (Received): ${formatSize(network.rx)}
Total TX (Transmitted): ${formatSize(network.tx)}
Total Traffic: ${formatSize(network.rx + network.tx)}

${warningSection}────────────────────────────
Status: ${warnings.length === 0 ? "✓ System Healthy" : "⚠ Attention Required"}
Report Time: ${new Date().toLocaleString("id-ID")}
\`\`\`
`.trim();

    await conn.sendMessage(
        m.chat,
        {
            text: message,
            contextInfo: {
                externalAdReply: {
                    title: "System Monitoring Report",
                    body: "Detailed server and bot metrics",
                    thumbnailUrl: "https://qu.ax/syOjg.jpg",
                    mediaType: 1,
                    renderLargerThumbnail: true,
                },
            },
        },
        { quoted: m }
    );
};

handler.help = ["os"];
handler.tags = ["info"];
handler.command = /^(os)$/i;

export default handler;