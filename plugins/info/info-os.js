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

async function getOSPrettyName() {
    try {
        const file = Bun.file("/etc/os-release");
        const text = await file.text();
        const info = Object.fromEntries(
            text
                .split("\n")
                .map(line => line.split("="))
                .filter(([key, val]) => key && val)
                .map(([key, val]) => [key.trim(), val.replace(/"/g, "")])
        );
        return info["PRETTY_NAME"] || os.platform();
    } catch {
        return os.platform();
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
            cmd: ["sh", "-c", "awk '/^cpu /{idle=$5; total=0; for(i=2;i<=NF;i++) total+=$i} END{print (total-idle)*100/total}' /proc/stat"],
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
        const ramUsed = meminfo["MemTotal"] - meminfo["MemAvailable"];
        const swapUsed = meminfo["SwapTotal"] - meminfo["SwapFree"];
        const totalUsed = ramUsed + swapUsed;
        const totalMemory = meminfo["MemTotal"] + meminfo["SwapTotal"];
        return { ramUsed: ramUsed * 1024, totalUsed: totalUsed * 1024, totalMemory: totalMemory * 1024 };
    } catch {
        return { ramUsed: 0, totalUsed: 0, totalMemory: 0 };
    }
}

function getDiskUsage() {
    try {
        const result = Bun.spawnSync({ cmd: ["df", "-k", "--output=size,used,target", "/"], stdout: "pipe" });
        const output = new TextDecoder().decode(result.stdout).trim().split("\n")[1];
        const parts = output.trim().split(/\s+/);
        const size = parseInt(parts[0]) * 1024;
        const used = parseInt(parts[1]) * 1024;
        return { used, total: size };
    } catch {
        return { used: 0, total: 0 };
    }
}

function getHeapInfo() {
    const mem = process.memoryUsage();
    return {
        heapUsed: formatSize(mem.heapUsed),
        heapTotal: formatSize(mem.heapTotal),
        heapPeak: formatSize(mem.rss),
    };
}

function makeBar(used, total, length = 10) {
    const ratio = total ? Math.min(1, Math.max(0, used / total)) : 0;
    const filled = Math.round(ratio * length);
    const empty = length - filled;
    return `[${"█".repeat(filled)}${"░".repeat(empty)}] ${(ratio * 100).toFixed(2)}%`;
}

let handler = async (m, { conn }) => {
    const osName = await getOSPrettyName();
    const cpu = getCPUInfo();
    const cpuBootUsage = getCPUUsageSinceBoot();
    const ram = await getRAMInfo();
    const disk = getDiskUsage();
    const heap = getHeapInfo();
    const bunVersion = Bun.version;
    const ramBar = makeBar(ram.totalUsed, ram.totalMemory);
    const diskBar = makeBar(disk.used, disk.total);
    const message = `
\`\`\`
SYSTEM STATUS
────────────────────────────
Operating System: ${osName}
Platform: ${os.platform()} (${os.arch()})
Kernel Version: ${os.release()}
Bun Version: ${bunVersion}
────────────────────────────
CPU Model: ${cpu.model}
CPU Cores: ${cpu.cores}
CPU Load (1m avg): ${cpu.load1} (${cpu.load1Pct}%)
CPU Load (5m avg): ${cpu.load5} (${cpu.load5Pct}%)
CPU Load (15m avg): ${cpu.load15} (${cpu.load15Pct}%)
CPU Usage Since Boot: ${cpuBootUsage}%
────────────────────────────
RAM Usage: ${formatSize(ram.totalUsed)} / ${formatSize(ram.totalMemory)}
${ramBar}

Disk Usage: ${formatSize(disk.used)} / ${formatSize(disk.total)}
${diskBar}
────────────────────────────
Heap Memory Used: ${heap.heapUsed}
Heap Memory Total: ${heap.heapTotal}
Heap Memory Peak: ${heap.heapPeak}
\`\`\`
`.trim();

    await conn.sendMessage(
        m.chat,
        {
            text: message,
            contextInfo: {
                externalAdReply: {
                    title: "System Monitoring Report",
                    body: "Real-time server and bot metrics",
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
handler.owner = true;

export default handler;