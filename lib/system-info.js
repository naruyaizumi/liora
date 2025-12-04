import { $ } from "bun";
import { Database } from "bun:sqlite";
import { Mutex } from "async-mutex";
import path from "path";

const DB_PATH = path.join(process.cwd(), "metrics.db");
const HISTORY_MUTEX = new Mutex();

const initDb = (() => {
    let initialized = false;
    return () => {
        if (initialized) return;

        const db = new Database(DB_PATH);
        db.run(`
      CREATE TABLE IF NOT EXISTS metrics_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp INTEGER NOT NULL,
        metric_type TEXT NOT NULL,
        value REAL NOT NULL
      )
    `);
        db.run(`
      CREATE INDEX IF NOT EXISTS idx_metrics_type_time 
      ON metrics_history(metric_type, timestamp)
    `);
        db.close();
        initialized = true;
    };
})();

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
            pretty: info["PRETTY_NAME"] || "Unknown",
            id: info["ID"] || "unknown",
            version: info["VERSION_ID"] || "unknown",
        };
    } catch {
        return {
            pretty: "Unknown",
            id: "unknown",
            version: "unknown",
        };
    }
}

export async function getCPUInfo() {
    try {
        const cpuinfo = await Bun.file("/proc/cpuinfo").text();
        const lines = cpuinfo.split("\n");

        let model = "Unknown";
        let cores = 0;
        let speed = 0;

        for (const line of lines) {
            if (line.startsWith("model name")) {
                model = line.split(":")[1].trim();
            }
            if (line.startsWith("processor")) {
                cores++;
            }
            if (line.startsWith("cpu MHz") && speed === 0) {
                speed = parseFloat(line.split(":")[1].trim());
            }
        }

        const loadavg = await Bun.file("/proc/loadavg").text();
        const loads = loadavg.split(" ");
        const load1 = parseFloat(loads[0]);
        const load5 = parseFloat(loads[1]);
        const load15 = parseFloat(loads[2]);

        function loadPercent(loadAvg) {
            return cores > 0 ? ((loadAvg / cores) * 100).toFixed(2) : "0.00";
        }

        return {
            model,
            cores,
            speed: speed.toFixed(2),
            load1: load1.toFixed(2),
            load5: load5.toFixed(2),
            load15: load15.toFixed(2),
            load1Pct: loadPercent(load1),
            load5Pct: loadPercent(load5),
            load15Pct: loadPercent(load15),
        };
    } catch {
        return {
            model: "Unknown",
            cores: 0,
            speed: "0.00",
            load1: "0.00",
            load5: "0.00",
            load15: "0.00",
            load1Pct: "0.00",
            load5Pct: "0.00",
            load15Pct: "0.00",
        };
    }
}

export async function getCPUUsageSinceBoot() {
    try {
        const stat = await Bun.file("/proc/stat").text();
        const cpuLine = stat.split("\n")[0];
        const values = cpuLine.split(/\s+/).slice(1).map(Number);
        const idle = values[3];
        const total = values.reduce((a, b) => a + b, 0);
        const usage = total > 0 ? ((total - idle) * 100) / total : 0;
        return usage.toFixed(2);
    } catch {
        return "0.00";
    }
}

export async function getRAMInfo() {
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
        const ramShared = (meminfo["Shmem"] || 0) * 1024;
        const swapTotal = meminfo["SwapTotal"] * 1024;
        const swapFree = meminfo["SwapFree"] * 1024;
        const swapUsed = swapTotal - swapFree;
        const swapCached = (meminfo["SwapCached"] || 0) * 1024;
        const totalUsed = ramUsed + swapUsed;
        const totalMemory = ramTotal + swapTotal;

        return {
            ramUsed,
            ramTotal,
            ramFree,
            ramAvailable,
            ramBuffers,
            ramCached,
            ramShared,
            swapUsed,
            swapTotal,
            swapCached,
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
            ramShared: 0,
            swapUsed: 0,
            swapTotal: 0,
            swapCached: 0,
            totalUsed: 0,
            totalMemory: 0,
        };
    }
}

export async function getDiskUsage() {
    try {
        const output = await $`df -k / | tail -1`.text();
        const parts = output.trim().split(/\s+/);
        const size = parseInt(parts[1]) * 1024;
        const used = parseInt(parts[2]) * 1024;
        const avail = parseInt(parts[3]) * 1024;
        return { used, total: size, available: avail };
    } catch {
        return { used: 0, total: 0, available: 0 };
    }
}

export async function getInodeUsage() {
    try {
        const output = await $`df -i / | tail -1`.text();
        const parts = output.trim().split(/\s+/);
        return {
            total: parseInt(parts[1]) || 0,
            used: parseInt(parts[2]) || 0,
            available: parseInt(parts[3]) || 0,
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
        const text = await Bun.file("/proc/net/dev").text();
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
        const version = await $`uname -r`.text();
        const hostname = await $`hostname`.text();
        return {
            version: version.trim(),
            hostname: hostname.trim(),
        };
    } catch {
        return {
            version: "Unknown",
            hostname: "Unknown",
        };
    }
}

export async function getSystemUptime() {
    try {
        const uptime = await Bun.file("/proc/uptime").text();
        const seconds = parseFloat(uptime.split(" ")[0]);
        return formatTime(seconds);
    } catch {
        return "0m";
    }
}

export async function getPostgreSQLInfo() {
    try {
        let version = "Not Installed";
        let status = "N/A";
        let connections = "N/A";
        let dbSize = "N/A";

        try {
            const versionOutput = await $`psql --version 2>/dev/null`.text();
            const versionMatch = versionOutput.match(/PostgreSQL\)?\s*([0-9.]+)/);
            if (versionMatch) {
                version = versionMatch[1];
            }
        } catch {
            return { version, status, connections, dbSize };
        }

        try {
            const statusOutput = await $`systemctl is-active postgresql 2>/dev/null`.text();
            status = statusOutput.trim() === "active" ? "Running" : "Stopped";
        } catch {
            try {
                await $`pgrep -x postgres`.quiet();
                status = "Running";
            } catch {
                status = "Stopped";
            }
        }

        if (status === "Running") {
            try {
                const connResult =
                    await $`sudo -u postgres psql -t -c "SELECT count(*) FROM pg_stat_activity;" 2>/dev/null`.text();
                const connCount = parseInt(connResult.trim());
                if (!isNaN(connCount)) {
                    connections = connCount.toString();
                }
            } catch {
                /* ignore */
            }

            try {
                const sizeResult =
                    await $`sudo -u postgres psql -t -c "SELECT pg_size_pretty(sum(pg_database_size(datname))::bigint) FROM pg_database;" 2>/dev/null`.text();
                const size = sizeResult.trim();
                if (size && !size.includes("ERROR")) {
                    dbSize = size;
                }
            } catch {
                /* ignore */
            }
        }

        return { version, status, connections, dbSize };
    } catch {
        return {
            version: "Not Installed",
            status: "N/A",
            connections: "N/A",
            dbSize: "N/A",
        };
    }
}

export async function getRedisInfo() {
    try {
        let version = "Not Installed";
        let status = "N/A";
        let memory = "N/A";
        let keys = "N/A";

        try {
            const versionOutput = await $`redis-server --version 2>/dev/null`.text();
            const versionMatch = versionOutput.match(/v=([\d.]+)/);
            if (versionMatch) {
                version = versionMatch[1];
            }
        } catch {
            return { version, status, memory, keys };
        }

        try {
            const statusOutput = await $`systemctl is-active redis-server 2>/dev/null`.text();
            status = statusOutput.trim() === "active" ? "Running" : "Stopped";
        } catch {
            try {
                await $`pgrep -x redis-server`.quiet();
                status = "Running";
            } catch {
                status = "Stopped";
            }
        }

        if (status === "Running") {
            try {
                const ping = await $`redis-cli ping 2>/dev/null`.text();
                if (ping.trim() === "PONG") {
                    try {
                        const memResult =
                            await $`redis-cli info memory 2>/dev/null | grep '^used_memory_human:' | cut -d: -f2`.text();
                        const mem = memResult.trim();
                        if (mem) memory = mem;
                    } catch {
                        /* ignore */
                    }

                    try {
                        const keysResult = await $`redis-cli dbsize 2>/dev/null`.text();
                        const keyCount = parseInt(keysResult.trim());
                        if (!isNaN(keyCount)) keys = keyCount.toString();
                    } catch {
                        /* ignore */
                    }
                }
            } catch {
                /* ignore */
            }
        }

        return { version, status, memory, keys };
    } catch {
        return {
            version: "Not Installed",
            status: "N/A",
            memory: "N/A",
            keys: "N/A",
        };
    }
}

export function getWarnings(cpu, ram, disk) {
    const warnings = [];
    const cpuLoad1Pct = parseFloat(cpu.load1Pct);

    if (cpuLoad1Pct > 200) {
        warnings.push("CPU Overload");
    } else if (cpuLoad1Pct > 150) {
        warnings.push("High CPU");
    }

    const ramUsagePct = ram.ramTotal > 0 ? (ram.ramUsed / ram.ramTotal) * 100 : 0;
    if (ramUsagePct > 95) {
        warnings.push("RAM Critical");
    } else if (ramUsagePct > 90) {
        warnings.push("High RAM");
    }

    const diskUsagePct = disk.total > 0 ? (disk.used / disk.total) * 100 : 0;
    if (diskUsagePct > 95) {
        warnings.push("Disk Full");
    } else if (diskUsagePct > 90) {
        warnings.push("Low Disk");
    }

    return warnings;
}

export async function saveMetricsHistory(cpu, ram, disk, heap) {
    initDb();

    await HISTORY_MUTEX.runExclusive(async () => {
        const db = new Database(DB_PATH);

        try {
            const timestamp = Date.now();
            const maxPoints = 60;

            const insert = db.prepare(
                "INSERT INTO metrics_history (timestamp, metric_type, value) VALUES (?, ?, ?)"
            );

            insert.run(timestamp, "cpu", parseFloat(cpu.load1Pct));
            insert.run(
                timestamp,
                "memory",
                ram.ramTotal > 0 ? (ram.ramUsed / ram.ramTotal) * 100 : 0
            );
            insert.run(timestamp, "disk", disk.total > 0 ? (disk.used / disk.total) * 100 : 0);
            insert.run(
                timestamp,
                "heap",
                heap.heapTotal > 0 ? (heap.heapUsed / heap.heapTotal) * 100 : 0
            );

            const deleteOld = db.prepare(`
                DELETE FROM metrics_history 
                WHERE id IN (
                    SELECT id FROM metrics_history 
                    WHERE metric_type = ? 
                    ORDER BY timestamp DESC 
                    LIMIT -1 OFFSET ?
                )
            `);

            deleteOld.run("cpu", maxPoints);
            deleteOld.run("memory", maxPoints);
            deleteOld.run("disk", maxPoints);
            deleteOld.run("heap", maxPoints);
        } finally {
            db.close();
        }
    }).catch((err) => {
        console.error("Failed to save metrics history:", err);
    });
}

export function getMetricsHistory() {
    initDb();

    const db = new Database(DB_PATH, { readonly: true });

    try {
        const result = { cpu: [], memory: [], disk: [], heap: [] };
        const select = db.prepare(`
            SELECT timestamp, value FROM metrics_history 
            WHERE metric_type = ? 
            ORDER BY timestamp ASC
        `);

        for (const type of ["cpu", "memory", "disk", "heap"]) {
            const rows = select.all(type);
            result[type] = rows.map((row) => ({
                time: row.timestamp,
                value: row.value,
            }));
        }

        return result;
    } finally {
        db.close();
    }
}
