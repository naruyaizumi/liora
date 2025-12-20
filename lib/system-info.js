import { readFile } from "fs/promises";
import { exec } from "child_process";
import { promisify } from "util";
import os from "os";

const execAsync = promisify(exec);

export function formatSize(bytes) {
    if (!bytes || isNaN(bytes)) return "0 B";
    const units = ["B", "KB", "MB", "GB", "TB"];
    let i = 0;
    while (bytes >= 1024 && i < units.length - 1) {
        bytes /= 1024;
        i++;
    }
    return `${bytes.toFixed(2)} ${units[i]}`;
}

export function formatTime(sec) {
    if (!sec || isNaN(sec)) return "0m";
    const m = Math.floor(sec / 60);
    const h = Math.floor(m / 60);
    const d = Math.floor(h / 24);
    return (
        [d && `${d}d`, h % 24 && `${h % 24}h`, m % 60 && `${m % 60}m`].filter(Boolean).join(" ") ||
        "0m"
    );
}

export async function getOSPrettyName() {
    try {
        const text = await readFile("/etc/os-release", "utf8");
        const info = Object.fromEntries(
            text
                .split("\n")
                .map((line) => line.split("="))
                .filter(([key, val]) => key && val)
                .map(([key, val]) => [key.trim(), val.replace(/"/g, "")])
        );
        return {
            pretty: info["PRETTY_NAME"] || "Unknown",
            id: info["ID"] || "unknown",
            version: info["VERSION_ID"] || "unknown",
        };
    } catch {
        return {
            pretty: os.type() + " " + os.release(),
            id: "unknown",
            version: os.release(),
        };
    }
}

export async function getCPUInfo() {
    try {
        const cpuinfo = await readFile("/proc/cpuinfo", "utf8");
        const lines = cpuinfo.split("\n");

        let model = "Unknown";
        let cores = 0;
        let speed = 0;

        for (const line of lines) {
            if (line.startsWith("model name")) model = line.split(":")[1].trim();
            if (line.startsWith("processor")) cores++;
            if (line.startsWith("cpu MHz") && speed === 0)
                speed = parseFloat(line.split(":")[1].trim());
        }

        const loadavg = await readFile("/proc/loadavg", "utf8");
        const loads = loadavg.split(" ").map(parseFloat);

        const loadPercent = (load) => (cores > 0 ? ((load / cores) * 100).toFixed(2) : "0.00");

        return {
            model,
            cores,
            speed: speed.toFixed(2),
            load1: loads[0].toFixed(2),
            load5: loads[1].toFixed(2),
            load15: loads[2].toFixed(2),
            load1Pct: loadPercent(loads[0]),
            load5Pct: loadPercent(loads[1]),
            load15Pct: loadPercent(loads[2]),
        };
    } catch {
        const cpus = os.cpus();
        const loadavg = os.loadavg();
        const cores = cpus.length;

        const loadPercent = (load) => (cores > 0 ? ((load / cores) * 100).toFixed(2) : "0.00");

        return {
            model: cpus[0]?.model || "Unknown",
            cores,
            speed: (cpus[0]?.speed || 0).toFixed(2),
            load1: loadavg[0].toFixed(2),
            load5: loadavg[1].toFixed(2),
            load15: loadavg[2].toFixed(2),
            load1Pct: loadPercent(loadavg[0]),
            load5Pct: loadPercent(loadavg[1]),
            load15Pct: loadPercent(loadavg[2]),
        };
    }
}

let _prevCPU = null;
export async function getCPUUsageSinceBoot() {
    try {
        const stat = await readFile("/proc/stat", "utf8");
        const cpuLine = stat.split("\n")[0];
        const values = cpuLine.split(/\s+/).slice(1).map(Number);
        const idle = values[3];
        const total = values.reduce((a, b) => a + b, 0);

        let usage = 0;
        if (_prevCPU) {
            const idleDelta = idle - _prevCPU.idle;
            const totalDelta = total - _prevCPU.total;
            usage = totalDelta > 0 ? ((totalDelta - idleDelta) * 100) / totalDelta : 0;
        }

        _prevCPU = { idle, total };
        return usage.toFixed(2);
    } catch {
        return "0.00";
    }
}

export async function getRAMInfo() {
    try {
        const text = await readFile("/proc/meminfo", "utf8");
        const meminfo = Object.fromEntries(
            text
                .split("\n")
                .map((l) => l.split(":"))
                .filter(([k, v]) => k && v)
                .map(([k, v]) => [k.trim(), parseInt(v.trim())])
        );

        const ramTotal = meminfo.MemTotal * 1024;
        const ramAvailable = meminfo.MemAvailable * 1024;
        const ramUsed = ramTotal - ramAvailable;
        const ramBuffers = (meminfo.Buffers || 0) * 1024;
        const ramCached = (meminfo.Cached || 0) * 1024;
        const ramShared = (meminfo.Shmem || 0) * 1024;

        const swapTotal = (meminfo.SwapTotal || 0) * 1024;
        const swapFree = (meminfo.SwapFree || 0) * 1024;
        const swapUsed = swapTotal - swapFree;
        const swapCached = (meminfo.SwapCached || 0) * 1024;

        return {
            ramUsed,
            ramTotal,
            ramFree: ramTotal - ramUsed,
            ramAvailable,
            ramBuffers,
            ramCached,
            ramShared,
            swapUsed,
            swapTotal,
            swapCached,
            totalUsed: ramUsed + swapUsed,
            totalMemory: ramTotal + swapTotal,
        };
    } catch {
        const totalMem = os.totalmem();
        const freeMem = os.freemem();
        const usedMem = totalMem - freeMem;

        return {
            ramUsed: usedMem,
            ramTotal: totalMem,
            ramFree: freeMem,
            ramAvailable: freeMem,
            ramBuffers: 0,
            ramCached: 0,
            ramShared: 0,
            swapUsed: 0,
            swapTotal: 0,
            swapCached: 0,
            totalUsed: usedMem,
            totalMemory: totalMem,
        };
    }
}

export async function getDiskUsage() {
    try {
        const { stdout } = await execAsync("df -k / --output=size,used,avail -B1 | tail -1");
        const parts = stdout.trim().split(/\s+/);
        return {
            total: parseInt(parts[0]),
            used: parseInt(parts[1]),
            available: parseInt(parts[2]),
        };
    } catch {
        return { total: 0, used: 0, available: 0 };
    }
}

export function getHeapInfo() {
    const mem = process.memoryUsage();
    return {
        heapUsed: mem.heapUsed,
        heapTotal: mem.heapTotal,
        rss: mem.rss,
        external: mem.external,
        arrayBuffers: mem.arrayBuffers || 0,
    };
}

export function getProcessInfo() {
    return {
        pid: process.pid,
        ppid: process.ppid || "N/A",
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch,
    };
}

export async function getNetworkStats() {
    try {
        const text = await readFile("/proc/net/dev", "utf8");
        const lines = text.split("\n").slice(2);
        let totalRx = 0,
            totalTx = 0,
            totalRxPackets = 0,
            totalTxPackets = 0;

        for (const line of lines) {
            if (!line.trim()) continue;
            const parts = line.trim().split(/\s+/);
            if (parts[0].includes("lo:")) continue;
            totalRx += parseInt(parts[1]) || 0;
            totalRxPackets += parseInt(parts[2]) || 0;
            totalTx += parseInt(parts[9]) || 0;
            totalTxPackets += parseInt(parts[10]) || 0;
        }

        return { rx: totalRx, tx: totalTx, rxPackets: totalRxPackets, txPackets: totalTxPackets };
    } catch {
        return { rx: 0, tx: 0, rxPackets: 0, txPackets: 0 };
    }
}

export async function getKernelInfo() {
    try {
        const { stdout: version } = await execAsync("uname -r");
        return { version: version.trim(), hostname: os.hostname() };
    } catch {
        return { version: os.release(), hostname: os.hostname() };
    }
}

export async function getSystemUptime() {
    try {
        const uptime = await readFile("/proc/uptime", "utf8");
        const seconds = parseFloat(uptime.split(" ")[0]);
        return formatTime(seconds);
    } catch {
        return formatTime(os.uptime());
    }
}

export function getWarnings(cpu, ram, disk) {
    const warnings = [];
    const cpuLoad1Pct = parseFloat(cpu.load1Pct);

    if (cpuLoad1Pct > 200) warnings.push("CPU Overload");
    else if (cpuLoad1Pct > 150) warnings.push("High CPU");

    const ramUsagePct = ram.ramTotal > 0 ? (ram.ramUsed / ram.ramTotal) * 100 : 0;
    if (ramUsagePct > 95) warnings.push("RAM Critical");
    else if (ramUsagePct > 90) warnings.push("High RAM");

    const diskUsagePct = disk.total > 0 ? (disk.used / disk.total) * 100 : 0;
    if (diskUsagePct > 95) warnings.push("Disk Full");
    else if (diskUsagePct > 90) warnings.push("Low Disk");

    return warnings;
}
