/**
 * @file System monitoring and diagnostics utilities
 * @module monitor/utils
 * @description Comprehensive system information gathering and monitoring tools
 * for server diagnostics, performance tracking, and health reporting.
 * @license Apache-2.0
 * @author Naruya Izumi
 */

import { $ } from "bun";

/**
 * Formats byte size into human-readable string
 * @function formatSize
 * @param {number} bytes - Size in bytes
 * @returns {string} Formatted size (e.g., "1.23 MB")
 *
 * @units
 * - B: Bytes
 * - KB: Kilobytes (1024 bytes)
 * - MB: Megabytes (1024 KB)
 * - GB: Gigabytes (1024 MB)
 * - TB: Terabytes (1024 GB)
 * - PB: Petabytes (1024 TB)
 */
export function formatSize(bytes) {
    if (!bytes || isNaN(bytes)) return "0 B";
    const units = ["B", "KB", "MB", "GB", "TB", "PB"];
    let i = 0;
    while (bytes >= 1024 && i < units.length - 1) {
        bytes /= 1024;
        i++;
    }
    return `${bytes.toFixed(2)} ${units[i]}`;
}

/**
 * Formats seconds into human-readable time string
 * @function formatTime
 * @param {number} seconds - Time in seconds
 * @returns {string} Formatted time (e.g., "1d 2h 3m 4s")
 */
export function formatTime(seconds) {
    if (!seconds || isNaN(seconds)) return "0s";
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    const parts = [];
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);
    if (secs > 0) parts.push(`${secs}s`);

    return parts.length > 0 ? parts.join(" ") : "0s";
}

/**
 * Creates a visual progress bar
 * @function makeProgressBar
 * @param {number} used - Used amount
 * @param {number} total - Total amount
 * @param {number} [length=10] - Bar length in characters
 * @returns {string} Progress bar string
 *
 * @indicators
 * - ✓: Normal (<80%)
 * - ⚠: Warning (80-90%)
 * - ✗: Critical (>90%)
 */
export function makeProgressBar(used, total, length = 10) {
    if (!total || total <= 0) return "[░░░░░░░░░░] 0%";

    const percentage = Math.min(100, (used / total) * 100);
    const filled = Math.round((percentage / 100) * length);
    const empty = length - filled;

    let indicator = "✓";
    if (percentage > 90) indicator = "✗";
    else if (percentage > 80) indicator = "⚠";

    const bar = "█".repeat(filled) + "░".repeat(empty);
    return `[${bar}] ${percentage.toFixed(1)}% ${indicator}`;
}

/**
 * Safely executes a shell command with fallback
 * @private
 * @async
 * @function safeExec
 * @param {string} command - Shell command to execute
 * @param {string} fallback - Default return value on error
 * @returns {Promise<string>} Command output or fallback
 */
async function safeExec(command, fallback = "") {
    try {
        const result = await $`sh -c ${command}`.text();
        return result;
    } catch {
        return fallback;
    }
}

/**
 * Retrieves operating system information
 * @async
 * @function getOSInfo
 * @returns {Promise<Object>} Operating system details
 *
 * @properties
 * - name: Full OS name (e.g., "Ubuntu 22.04.3 LTS")
 * - distribution: Distribution name (e.g., "ubuntu")
 * - codename: Release codename (e.g., "jammy")
 * - base: Base distribution (e.g., "debian")
 * - version: Version number (e.g., "22.04")
 * - kernel: Kernel version
 * - hostname: System hostname
 * - platform: Platform (Linux, Darwin, etc.)
 * - architecture: CPU architecture
 * - bits: 32-bit or 64-bit
 * - uptime: System uptime in seconds
 */
export async function getOSInfo() {
    const osRelease = await safeExec("cat /etc/os-release 2>/dev/null", "");
    const kernel = await safeExec("uname -r 2>/dev/null", "unknown");
    const hostname = await safeExec("hostname 2>/dev/null", "unknown");
    const platform = await safeExec("uname -s 2>/dev/null", "unknown");
    const machine = await safeExec("uname -m 2>/dev/null", "unknown");
    const uptime = await safeExec("cat /proc/uptime 2>/dev/null", "0 0");
    const debianVersion = await safeExec("cat /etc/debian_version 2>/dev/null", "");
    const lsbRelease = await safeExec("lsb_release -cs 2>/dev/null", "");

    // Parse OS release file
    const info = Object.fromEntries(
        osRelease
            .split("\n")
            .filter((line) => line.includes("="))
            .map((line) => {
                const [key, ...value] = line.split("=");
                return [key.trim(), value.join("=").replace(/"/g, "").trim()];
            })
    );

    // Determine codename
    let codename = lsbRelease.trim() || info.VERSION_CODENAME || info.UBUNTU_CODENAME || "";
    if (!codename && info.VERSION) {
        const match = info.VERSION.match(/\(([^)]+)\)/);
        if (match) codename = match[1];
    }

    // Determine architecture bits
    const bits = machine.trim().includes("64")
        ? "64 Bit"
        : machine.trim().includes("32")
          ? "32 Bit"
          : "Unknown";

    return {
        name: info.PRETTY_NAME || info.NAME || "Unknown",
        distribution: info.NAME || "Unknown",
        codename: codename,
        base: info.ID_LIKE || info.ID || "debian",
        version: info.VERSION_ID || info.VERSION || "unknown",
        debianVersion: debianVersion.trim(),
        kernel: kernel.trim(),
        hostname: hostname.trim(),
        platform: platform.trim(),
        architecture: machine.trim(),
        bits: bits,
        uptime: parseFloat(uptime.split(" ")[0]),
    };
}

/**
 * Retrieves system hardware and shell information
 * @async
 * @function getSystemInfo
 * @returns {Promise<Object>} System hardware and shell details
 *
 * @properties
 * - shell: Shell name and version (e.g., "bash 5.1.16")
 * - host: System hardware information
 */
export async function getSystemInfo() {
    const shell = await safeExec("echo $SHELL 2>/dev/null", "unknown");
    const shellVersion = await safeExec("$SHELL --version 2>/dev/null | head -1", "");
    const dmidecode = await safeExec("dmidecode -s system-product-name 2>/dev/null", "");
    const manufacturer = await safeExec("dmidecode -s system-manufacturer 2>/dev/null", "");
    const biosVersion = await safeExec("dmidecode -s bios-version 2>/dev/null", "");

    // Build host information
    let hostInfo = dmidecode.trim();
    if (manufacturer.trim() && manufacturer.trim() !== "System manufacturer") {
        hostInfo = `${manufacturer.trim()} ${hostInfo}`.trim();
    }
    if (biosVersion.trim()) {
        hostInfo = `${hostInfo} ${biosVersion.trim()}`.trim();
    }

    // Fallback to sysfs if dmidecode fails
    if (!hostInfo) {
        const productName = await safeExec("cat /sys/class/dmi/id/product_name 2>/dev/null", "");
        const boardName = await safeExec("cat /sys/class/dmi/id/board_name 2>/dev/null", "");
        hostInfo = productName.trim() || boardName.trim() || "Unknown";
    }

    // Parse shell version
    let shellName = shell.trim().split("/").pop();
    const shellVersionClean = shellVersion.trim().split("\n")[0];

    if (shellVersionClean.includes("version")) {
        const versionMatch = shellVersionClean.match(/version\s+([\d.]+)/i);
        if (versionMatch) {
            shellName = `${shellName} ${versionMatch[1]}`;
        }
    } else if (shellVersionClean.match(/\d+\.\d+/)) {
        const versionMatch = shellVersionClean.match(/(\d+\.\d+[\d.]*)/);
        if (versionMatch) {
            shellName = `${shellName} ${versionMatch[1]}`;
        }
    }

    return {
        shell: shellName,
        host: hostInfo || "Unknown",
    };
}

/**
 * Retrieves CPU features and virtualization information
 * @async
 * @function getCPUFeatures
 * @returns {Promise<Object>} CPU features and virtualization status
 *
 * @properties
 * - aesni: AES-NI instruction support
 * - virtualization: Hypervisor type (if virtualized)
 * - vmxAmdv: Intel VT-x / AMD-V status
 * - tcpCC: TCP congestion control algorithm
 * - isVM: Whether running in virtual machine
 */
export async function getCPUFeatures() {
    const cpuinfo = await safeExec("cat /proc/cpuinfo 2>/dev/null", "");
    const flags = cpuinfo.match(/flags\s*:\s*(.+)/)?.[1] || "";

    // Check CPU features
    const aesni = flags.includes("aes");
    const vmx = flags.includes("vmx");
    const svm = flags.includes("svm");
    const hypervisor = flags.includes("hypervisor");

    // Determine virtualization status
    let virtualization = "None";
    let isVM = "No";

    const dmidecodeSystem = await safeExec("dmidecode -s system-product-name 2>/dev/null", "");
    const dmidecodeManufacturer = await safeExec(
        "dmidecode -s system-manufacturer 2>/dev/null",
        ""
    );
    const systemVendor = await safeExec("cat /sys/class/dmi/id/sys_vendor 2>/dev/null", "");
    const productName = await safeExec("cat /sys/class/dmi/id/product_name 2>/dev/null", "");
    const boardName = await safeExec("cat /sys/class/dmi/id/board_name 2>/dev/null", "");

    const allInfo =
        `${dmidecodeSystem} ${dmidecodeManufacturer} ${systemVendor} ${productName} ${boardName}`.toLowerCase();

    // Detect virtualization platform
    if (allInfo.includes("vmware")) {
        virtualization = "VMware";
        isVM = "Yes (VMware)";
    } else if (allInfo.includes("virtualbox")) {
        virtualization = "VirtualBox";
        isVM = "Yes (VirtualBox)";
    } else if (allInfo.includes("qemu") || allInfo.includes("kvm")) {
        virtualization = "KVM/QEMU";
        isVM = "Yes (KVM)";
    } else if (
        allInfo.includes("microsoft") ||
        allInfo.includes("hyper-v") ||
        allInfo.includes("virtual machine")
    ) {
        virtualization = "Microsoft Hyper-V";
        isVM = "Yes (Hyper-V)";
    } else if (allInfo.includes("xen")) {
        virtualization = "Xen";
        isVM = "Yes (Xen)";
    } else if (allInfo.includes("bochs")) {
        virtualization = "Bochs";
        isVM = "Yes (Bochs)";
    } else if (allInfo.includes("parallels")) {
        virtualization = "Parallels";
        isVM = "Yes (Parallels)";
    } else if (hypervisor) {
        virtualization = "Unknown Hypervisor";
        isVM = "Yes";
    }

    // VT-x/AMD-V status
    let vmxStatus = "✗ Disabled";
    if (vmx || svm) {
        vmxStatus = "✓ Enabled";
    }

    // TCP congestion control
    const tcpCongestion = await safeExec(
        "sysctl net.ipv4.tcp_congestion_control 2>/dev/null",
        "net.ipv4.tcp_congestion_control = unknown"
    );
    const tcpCC = tcpCongestion.split("=")[1]?.trim() || "unknown";

    return {
        aesni: aesni ? "✓ Enabled" : "✗ Disabled",
        virtualization: virtualization,
        vmxAmdv: vmxStatus,
        tcpCC: tcpCC,
        isVM: isVM,
    };
}

/**
 * Checks network connectivity status
 * @async
 * @function getNetworkFeatures
 * @returns {Promise<Object>} Network connectivity status
 */
export async function getNetworkFeatures() {
    const ipv4Check = await safeExec("timeout 3 curl -4 -s https://api.ipify.org 2>/dev/null", "");
    const ipv6Check = await safeExec(
        "timeout 3 curl -6 -s https://api64.ipify.org 2>/dev/null",
        ""
    );

    return {
        ipv4: ipv4Check.trim() ? "Online" : "Offline",
        ipv6: ipv6Check.trim() ? "Online" : "Offline",
    };
}

/**
 * Retrieves IP address and geolocation information
 * @async
 * @function getIPInfo
 * @returns {Promise<Object>} IP and location information
 *
 * @source
 * - Uses ipapi.co for geolocation
 * - Falls back gracefully on timeout/error
 */
export async function getIPInfo() {
    try {
        const response = await fetch("https://ipapi.co/json/", {
            signal: AbortSignal.timeout(5000),
        });
        const data = await response.json();

        const host = await safeExec("hostname -f 2>/dev/null || hostname 2>/dev/null", "unknown");

        return {
            host: host.trim(),
            isp: data.org || "Unknown",
            organization: data.org || "Unknown",
            asn: data.asn || "Unknown",
            location: `${data.city || "Unknown"}, ${data.country_name || "Unknown"}`,
            region: data.region || "Unknown",
            timezone: data.timezone || "Unknown",
            continent: data.continent_code || "Unknown",
        };
    } catch {
        // Fallback on API failure
        const host = await safeExec("hostname -f 2>/dev/null || hostname 2>/dev/null", "unknown");
        return {
            host: host.trim(),
            isp: "Unknown",
            organization: "Unknown",
            asn: "Unknown",
            location: "Unknown",
            region: "Unknown",
            timezone: "Unknown",
            continent: "Unknown",
        };
    }
}

/**
 * Retrieves software runtime information
 * @async
 * @function getSoftwareInfo
 * @returns {Promise<Object>} Software environment details
 */
export async function getSoftwareInfo() {
    const nodeVersion = process.version.replace("v", "");
    const bunVersion = await safeExec("bun --version 2>/dev/null", "unknown");
    const processId = process.pid;
    const parentProcessId = process.ppid;

    // Bot uptime calculation
    const botStartTime = global.timestamp?.connect || new Date();
    const botUptime = (Date.now() - new Date(botStartTime).getTime()) / 1000;

    // Project structure checks
    const nodeModules = await safeExec(
        "find node_modules -maxdepth 1 -type d 2>/dev/null | wc -l",
        "0"
    );
    const packageJson = await safeExec("test -f package.json && echo 'Yes' || echo 'No'", "No");

    return {
        node: nodeVersion,
        bun: bunVersion.trim(),
        pid: processId,
        ppid: parentProcessId,
        botUptime: botUptime,
        nodeModules: parseInt(nodeModules.trim()) - 1, // Subtract 1 for the node_modules directory itself
        hasPackageJson: packageJson.trim(),
    };
}

/**
 * Retrieves detailed CPU information and usage metrics
 * @async
 * @function getCPUInfo
 * @returns {Promise<Object>} CPU details and performance metrics
 *
 * @metrics
 * - Load averages (1, 5, 15 minutes)
 * - CPU usage percentage
 * - Clock speed and cache information
 * - Architecture details
 */
export async function getCPUInfo() {
    const cpuInfo = await safeExec("cat /proc/cpuinfo 2>/dev/null", "");
    const loadAvg = await safeExec("cat /proc/loadavg 2>/dev/null", "0 0 0");

    let model = "Unknown";
    let cores = 0;
    let mhz = 0;
    let cacheSize = "";

    // Parse /proc/cpuinfo
    const lines = cpuInfo.split("\n");
    for (const line of lines) {
        if (line.startsWith("model name")) {
            model = line.split(":").slice(1).join(":").trim();
        }
        if (line.startsWith("processor")) {
            cores++;
        }
        if (line.startsWith("cpu MHz") && mhz === 0) {
            mhz = parseFloat(line.split(":")[1].trim());
        }
        if (line.startsWith("cache size") && !cacheSize) {
            cacheSize = line.split(":")[1].trim();
        }
    }

    // Fallback core count detection
    if (cores === 0) {
        const nproc = await safeExec("nproc 2>/dev/null", "1");
        cores = parseInt(nproc.trim());
    }

    // Calculate load percentages
    const loads = loadAvg.split(/\s+/).slice(0, 3).map(Number);
    const loadPercent = (load) => ((load / cores) * 100).toFixed(2);

    // Calculate CPU usage from /proc/stat
    let usage = "0.00";
    const stat = await safeExec("cat /proc/stat 2>/dev/null", "cpu 0 0 0 0");
    const cpuLine = stat.split("\n")[0];
    const values = cpuLine.split(/\s+/).slice(1).map(Number);
    const idle = values[3] || 0;
    const total = values.reduce((a, b) => a + b, 0);

    // Compare with previous measurement
    if (global._prevCPU && total > 0) {
        const idleDelta = idle - global._prevCPU.idle;
        const totalDelta = total - global._prevCPU.total;
        usage =
            totalDelta > 0 ? (((totalDelta - idleDelta) * 100) / totalDelta).toFixed(2) : "0.00";
    }

    // Store for next comparison
    global._prevCPU = { idle, total };

    // Get frequency information
    const arch = await safeExec("uname -m 2>/dev/null", "unknown");
    const cpuFreq = await safeExec(
        "cat /sys/devices/system/cpu/cpu0/cpufreq/scaling_cur_freq 2>/dev/null",
        ""
    );
    const maxFreq = await safeExec(
        "cat /sys/devices/system/cpu/cpu0/cpufreq/scaling_max_freq 2>/dev/null",
        ""
    );

    // Format speed information
    let speedInfo = mhz > 0 ? `${mhz.toFixed(2)} MHz` : "Unknown";
    if (cpuFreq) {
        const currentMhz = (parseInt(cpuFreq) / 1000).toFixed(2);
        const maxMhz = maxFreq ? (parseInt(maxFreq) / 1000).toFixed(2) : "";
        speedInfo = maxMhz ? `${currentMhz} MHz (Max: ${maxMhz} MHz)` : `${currentMhz} MHz`;
    }

    return {
        model: model.replace(/\s+/g, " "),
        cores,
        speed: speedInfo,
        cache: cacheSize || "Unknown",
        load1: loads[0]?.toFixed(2) || "0.00",
        load5: loads[1]?.toFixed(2) || "0.00",
        load15: loads[2]?.toFixed(2) || "0.00",
        load1Pct: loadPercent(loads[0]),
        load5Pct: loadPercent(loads[1]),
        load15Pct: loadPercent(loads[2]),
        usage: usage,
        architecture: arch.trim(),
    };
}

/**
 * Retrieves detailed memory and swap information
 * @async
 * @function getMemoryInfo
 * @returns {Promise<Object>} Memory statistics
 *
 * @source
 * - Parses /proc/meminfo for detailed memory breakdown
 * - Includes swap, buffers, cache, and kernel memory
 */
export async function getMemoryInfo() {
    const memInfo = await safeExec("cat /proc/meminfo 2>/dev/null", "");
    const memLines = memInfo.split("\n");

    let memTotal = 0,
        memFree = 0,
        memAvailable = 0,
        buffers = 0,
        cached = 0;
    let swapTotal = 0,
        swapFree = 0,
        swapCached = 0;

    // Parse /proc/meminfo
    for (const line of memLines) {
        if (!line.includes(":")) continue;
        const [key, value] = line.split(":").map((s) => s.trim());
        const numValue = parseInt(value) * 1024; // Convert from KB to bytes

        if (key === "MemTotal") memTotal = numValue;
        else if (key === "MemFree") memFree = numValue;
        else if (key === "MemAvailable") memAvailable = numValue;
        else if (key === "Buffers") buffers = numValue;
        else if (key === "Cached") cached = numValue;
        else if (key === "SwapTotal") swapTotal = numValue;
        else if (key === "SwapFree") swapFree = numValue;
        else if (key === "SwapCached") swapCached = numValue;
    }

    // Calculate derived values
    const memUsed = memTotal - memAvailable;
    const swapUsed = swapTotal - swapFree;

    // Additional memory stats from /proc/vmstat
    let active = 0,
        inactive = 0,
        dirty = 0,
        writeback = 0;
    const vmstat = await safeExec("cat /proc/vmstat 2>/dev/null", "");
    const vmLines = vmstat.split("\n");
    for (const line of vmLines) {
        if (line.startsWith("nr_active_file")) active = parseInt(line.split(" ")[1]) * 4096;
        else if (line.startsWith("nr_inactive_file"))
            inactive = parseInt(line.split(" ")[1]) * 4096;
        else if (line.startsWith("nr_dirty")) dirty = parseInt(line.split(" ")[1]) * 4096;
        else if (line.startsWith("nr_writeback")) writeback = parseInt(line.split(" ")[1]) * 4096;
    }

    return {
        total: memTotal,
        used: memUsed,
        free: memFree,
        available: memAvailable,
        buffers,
        cached,
        swapTotal,
        swapUsed,
        swapFree,
        swapCached,
        active,
        inactive,
        dirty,
        writeback,
        shmem: memTotal - memFree - buffers - cached,
        slab: 0,
    };
}

/**
 * Retrieves disk usage and I/O statistics
 * @async
 * @function getDiskInfo
 * @returns {Promise<Object>} Disk information
 *
 * @data
 * - Filesystem-level usage from df
 * - I/O statistics from /proc/diskstats
 * - Total aggregated values
 */
export async function getDiskInfo() {
    const dfOutput = await safeExec("df -B1 2>/dev/null | tail -n +2", "");
    const lines = dfOutput.trim().split("\n");

    const disks = [];
    let totalSize = 0,
        totalUsed = 0,
        totalAvailable = 0;

    // Parse df output
    for (const line of lines) {
        const parts = line.trim().split(/\s+/);
        if (parts.length < 6) continue;

        const size = parseInt(parts[1]) || 0;
        const used = parseInt(parts[2]) || 0;
        const avail = parseInt(parts[3]) || 0;

        disks.push({
            filesystem: parts[0],
            type: "unknown",
            size,
            used,
            available: avail,
            mountpoint: parts[5] || "/",
            inodesTotal: 0,
            inodesUsed: 0,
            inodesAvailable: 0,
        });

        totalSize += size;
        totalUsed += used;
        totalAvailable += avail;
    }

    // Get I/O statistics
    let ioStats = { readBytes: 0, writeBytes: 0, readOps: 0, writeOps: 0 };
    const diskstats = await safeExec("cat /proc/diskstats 2>/dev/null", "");
    const diskLines = diskstats.split("\n");
    for (const line of diskLines) {
        const parts = line.trim().split(/\s+/);
        if (parts.length >= 14) {
            ioStats.readBytes += (parseInt(parts[5]) || 0) * 512;
            ioStats.writeBytes += (parseInt(parts[9]) || 0) * 512;
            ioStats.readOps += parseInt(parts[3]) || 0;
            ioStats.writeOps += parseInt(parts[7]) || 0;
        }
    }

    return {
        disks,
        total: {
            size: totalSize,
            used: totalUsed,
            available: totalAvailable,
        },
        io: ioStats,
    };
}

/**
 * Retrieves network interface statistics and connection information
 * @async
 * @function getNetworkInfo
 * @returns {Promise<Object>} Network information
 */
export async function getNetworkInfo() {
    const netDev = await safeExec("cat /proc/net/dev 2>/dev/null", "");
    const lines = netDev.split("\n").slice(2);

    let totalRx = 0,
        totalTx = 0;
    let totalRxPackets = 0,
        totalTxPackets = 0;
    const interfaces = [];

    // Parse network device statistics
    for (const line of lines) {
        if (!line.trim() || line.includes("lo:")) continue;

        const parts = line.trim().split(/\s+/);
        if (parts.length < 11) continue;

        const iface = parts[0].replace(":", "");
        const rxBytes = parseInt(parts[1]) || 0;
        const rxPackets = parseInt(parts[2]) || 0;
        const txBytes = parseInt(parts[9]) || 0;
        const txPackets = parseInt(parts[10]) || 0;

        totalRx += rxBytes;
        totalTx += txBytes;
        totalRxPackets += rxPackets;
        totalTxPackets += txPackets;

        interfaces.push({
            name: iface,
            rxBytes,
            rxPackets,
            txBytes,
            txPackets,
            rxErrors: parseInt(parts[3]) || 0,
            txErrors: parseInt(parts[11]) || 0,
        });
    }

    // Get active connections
    const connOutput = await safeExec("ss -tun state connected 2>/dev/null | wc -l", "1");
    const connections = Math.max(0, parseInt(connOutput.trim()) - 1);

    // Get DNS servers
    const resolv = await safeExec("cat /etc/resolv.conf 2>/dev/null | grep nameserver", "");
    const dnsServers = resolv
        .split("\n")
        .filter((line) => line.includes("nameserver"))
        .map((line) => line.split(/\s+/)[1])
        .filter(Boolean);

    return {
        total: {
            rxBytes: totalRx,
            txBytes: totalTx,
            rxPackets: totalRxPackets,
            txPackets: totalTxPackets,
        },
        interfaces,
        connections,
        dnsServers,
    };
}

/**
 * Retrieves process statistics and system load
 * @async
 * @function getProcessInfo
 * @returns {Promise<Object>} Process information
 */
export async function getProcessInfo() {
    const uptimeStr = await safeExec("cat /proc/uptime 2>/dev/null", "0 0");
    const uptimeSeconds = parseFloat(uptimeStr.split(" ")[0]);

    const processCount = await safeExec("ps -e --no-headers 2>/dev/null | wc -l", "0");
    const loadAvg = await safeExec("cat /proc/loadavg 2>/dev/null", "0 0 0");
    const loads = loadAvg.split(" ").slice(0, 3).map(Number);

    // Get process state breakdown
    const zombies = await safeExec(
        "ps aux 2>/dev/null | grep 'defunct' | grep -v grep | wc -l",
        "0"
    );
    const running = await safeExec("ps -e -o stat 2>/dev/null | grep R | wc -l", "0");
    const sleeping = await safeExec("ps -e -o stat 2>/dev/null | grep S | wc -l", "0");
    const stopped = await safeExec("ps -e -o stat 2>/dev/null | grep T | wc -l", "0");
    const threads = await safeExec("ps -eL --no-headers 2>/dev/null | wc -l", "0");
    const ctxt = await safeExec("cat /proc/stat 2>/dev/null | grep ctxt", "ctxt 0");

    return {
        total: parseInt(processCount.trim()) || 0,
        running: parseInt(running.trim()) || 0,
        sleeping: parseInt(sleeping.trim()) || 0,
        stopped: parseInt(stopped.trim()) || 0,
        zombies: parseInt(zombies.trim()) || 0,
        uptime: uptimeSeconds,
        load1: loads[0] || 0,
        load5: loads[1] || 0,
        load15: loads[2] || 0,
        threads: parseInt(threads.trim()) || 0,
        contextSwitches: parseInt(ctxt.split(" ")[1]) || 0,
    };
}

/**
 * Detects containerization environment
 * @async
 * @function getContainerInfo
 * @returns {Promise<Object>} Container information
 *
 * @detection
 * - Docker: /proc/1/cgroup contains "docker"
 * - LXC: /proc/1/environ contains "container=lxc"
 * - Kubernetes: KUBERNETES_SERVICE environment variable
 */
export async function getContainerInfo() {
    const cgroup = await safeExec("cat /proc/1/cgroup 2>/dev/null", "");
    const isDocker = cgroup.includes("docker");
    const environ = await safeExec("cat /proc/1/environ 2>/dev/null | tr '\\0' '\\n'", "");
    const isLxc = environ.includes("container=lxc");
    const hasKube = await safeExec("env 2>/dev/null | grep KUBERNETES_SERVICE", "");

    let containerType = "None";
    let containerId = "";

    if (isDocker) {
        containerType = "Docker";
        const cid = await safeExec(
            "cat /proc/self/cgroup 2>/dev/null | grep 'docker' | head -1 | cut -d/ -f3",
            ""
        );
        containerId = cid.trim().slice(0, 12);
    } else if (isLxc) {
        containerType = "LXC";
    } else if (hasKube.trim()) {
        containerType = "Kubernetes";
    }

    const hostname = await safeExec("hostname 2>/dev/null", "unknown");

    return {
        type: containerType,
        id: containerId,
        hostname: hostname.trim(),
        isContainer: containerType !== "None",
    };
}

/**
 * Retrieves real-time system load from vmstat
 * @async
 * @function getSystemLoad
 * @returns {Promise<Object>} System load metrics
 */
export async function getSystemLoad() {
    const data = await safeExec("vmstat 1 2 2>/dev/null | tail -1", "");

    if (!data.trim()) {
        return {
            procs: { r: 0, b: 0 },
            memory: { swpd: 0, free: 0, buff: 0, cache: 0 },
            swap: { si: 0, so: 0 },
            io: { bi: 0, bo: 0 },
            system: { in: 0, cs: 0 },
            cpu: { us: 0, sy: 0, id: 100, wa: 0, st: 0 },
        };
    }

    const parts = data
        .trim()
        .split(/\s+/)
        .filter((p) => p !== "");

    if (parts.length < 12) {
        return {
            procs: { r: 0, b: 0 },
            memory: { swpd: 0, free: 0, buff: 0, cache: 0 },
            swap: { si: 0, so: 0 },
            io: { bi: 0, bo: 0 },
            system: { in: 0, cs: 0 },
            cpu: { us: 0, sy: 0, id: 100, wa: 0, st: 0 },
        };
    }

    const cpuIndex = 12;

    return {
        procs: {
            r: parseInt(parts[0]) || 0,
            b: parseInt(parts[1]) || 0,
        },
        memory: {
            swpd: parseInt(parts[2]) || 0,
            free: parseInt(parts[3]) || 0,
            buff: parseInt(parts[4]) || 0,
            cache: parseInt(parts[5]) || 0,
        },
        swap: {
            si: parseInt(parts[6]) || 0,
            so: parseInt(parts[7]) || 0,
        },
        io: {
            bi: parseInt(parts[8]) || 0,
            bo: parseInt(parts[9]) || 0,
        },
        system: {
            in: parseInt(parts[10]) || 0,
            cs: parseInt(parts[11]) || 0,
        },
        cpu: {
            us: cpuIndex < parts.length ? parseInt(parts[cpuIndex]) || 0 : 0,
            sy: cpuIndex + 1 < parts.length ? parseInt(parts[cpuIndex + 1]) || 0 : 0,
            id: cpuIndex + 2 < parts.length ? parseInt(parts[cpuIndex + 2]) || 0 : 100,
            wa: cpuIndex + 3 < parts.length ? parseInt(parts[cpuIndex + 3]) || 0 : 0,
            st: cpuIndex + 4 < parts.length ? parseInt(parts[cpuIndex + 4]) || 0 : 0,
        },
    };
}

/**
 * Generates system warnings based on resource thresholds
 * @async
 * @function getWarnings
 * @param {Object} cpu - CPU information object
 * @param {Object} memory - Memory information object
 * @param {Object} disk - Disk information object
 * @param {Object} processes - Process information object
 * @returns {Array<string>} Array of warning messages
 *
 * @thresholds
 * - CPU: >70% warning, >90% critical
 * - Memory: >85% warning, >95% critical
 * - Swap: >50% warning
 * - Disk: >85% warning, >95% critical
 * - Zombie processes: >10 warning
 */
export async function getWarnings(cpu, memory, disk, processes) {
    const warnings = [];

    const cpuLoad1 = parseFloat(cpu.load1Pct);
    if (cpuLoad1 > 90) warnings.push("⚠︎ CRITICAL: CPU load >90% - System overload!");
    else if (cpuLoad1 > 70) warnings.push("⚠︎ WARNING: High CPU load >70%");

    const memUsage = (memory.used / memory.total) * 100;
    if (memUsage > 95) warnings.push("⚠︎ CRITICAL: Memory usage >95% - OOM risk!");
    else if (memUsage > 85) warnings.push("⚠︎ WARNING: High memory usage >85%");

    if (memory.swapTotal > 0) {
        const swapUsage = (memory.swapUsed / memory.swapTotal) * 100;
        if (swapUsage > 50) warnings.push("⚠︎ WARNING: High swap usage >50%");
    }

    const diskUsage = (disk.total.used / disk.total.size) * 100;
    if (diskUsage > 95) warnings.push("⚠︎ CRITICAL: Disk usage >95% - Cleanup needed!");
    else if (diskUsage > 85) warnings.push("⚠︎ WARNING: High disk usage >85%");

    if (processes.zombies > 10) warnings.push("⚠︎ WARNING: Many zombie processes (>10)");

    return warnings;
}

/**
 * Retrieves Node.js heap memory information
 * @function getHeapInfo
 * @returns {Object} Node.js memory usage statistics
 */
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

/**
 * Retrieves service information for Liora bot
 * @async
 * @function getServiceInfo
 * @returns {Promise<Object>} Service status information
 *
 * @detection
 * - systemd: systemctl status
 * - pm2: PM2 process list
 * - none: No service manager detected
 */
export async function getServiceInfo() {
    const serviceName = "liora";

    const systemdStatus = await safeExec("systemctl is-active liora 2>/dev/null", "inactive");

    if (systemdStatus.trim() === "active") {
        const info = await safeExec("systemctl status liora --no-pager 2>/dev/null", "");
        if (!info) {
            return {
                name: serviceName,
                type: "systemd",
                description: "Active but status unavailable",
                status: "active",
                active: "N/A",
                memory: "N/A",
                cpu: "N/A",
                tasks: "N/A",
                mainPid: "N/A",
            };
        }

        const lines = info.split("\n");
        const nameLine = lines.find((l) => l.includes(".service - "));
        const activeLine = lines.find((l) => l.includes("Active:"));
        const memoryLine = lines.find((l) => l.includes("Memory:"));
        const cpuLine = lines.find((l) => l.includes("CPU:"));
        const tasksLine = lines.find((l) => l.includes("Tasks:"));
        const mainPidLine = lines.find((l) => l.includes("Main PID:"));

        const description = nameLine?.split(".service - ")[1]?.trim() || "N/A";

        return {
            name: serviceName,
            type: "systemd",
            description: description,
            status: "active",
            active: activeLine?.split("Active: ")[1]?.split(";")[0]?.trim() || "N/A",
            memory: memoryLine?.split("Memory: ")[1]?.trim() || "N/A",
            cpu: cpuLine?.split("CPU: ")[1]?.trim() || "N/A",
            tasks: tasksLine?.split("Tasks: ")[1]?.split("(")[0]?.trim() || "N/A",
            mainPid: mainPidLine?.split("Main PID: ")[1]?.split(" ")[0]?.trim() || "N/A",
        };
    }

    // Check for PM2
    const pm2List = await safeExec("pm2 list 2>/dev/null | grep liora", "");
    if (pm2List.trim()) {
        const pm2Info = await safeExec("pm2 jlist 2>/dev/null", "[]");
        try {
            const processes = JSON.parse(pm2Info);
            const lioraProcess = processes.find(
                (p) => p.name === "liora" || p.name.includes("liora")
            );

            if (lioraProcess) {
                const uptime = lioraProcess.pm2_env?.pm_uptime
                    ? Date.now() - lioraProcess.pm2_env.pm_uptime
                    : 0;
                return {
                    name: serviceName,
                    type: "pm2",
                    description: "Running under PM2",
                    status: lioraProcess.pm2_env?.status || "unknown",
                    active: `up ${formatTime(uptime / 1000)}`,
                    memory: lioraProcess.monit?.memory
                        ? formatSize(lioraProcess.monit.memory)
                        : "N/A",
                    cpu: lioraProcess.monit?.cpu ? `${lioraProcess.monit.cpu}%` : "N/A",
                    tasks: "N/A",
                    mainPid: lioraProcess.pid || "N/A",
                };
            }
        } catch {
            // JSON parse failed
        }
    }

    // No service manager detected
    return {
        name: serviceName,
        type: "none",
        description: "Not running or not configured",
        status: "inactive",
        active: "N/A",
        memory: "N/A",
        cpu: "N/A",
        tasks: "N/A",
        mainPid: "N/A",
    };
}

/**
 * Retrieves user login information
 * @async
 * @function getUserInfo
 * @returns {Promise<Object>} User login statistics
 */
export async function getUserInfo() {
    const users = await safeExec("who 2>/dev/null | wc -l", "0");
    const lastLogin = await safeExec("last -n 5 2>/dev/null", "");

    return {
        loggedIn: parseInt(users.trim()) || 0,
        recentLogins: lastLogin
            .split("\n")
            .filter((line) => line.trim() && !line.startsWith("wtmp"))
            .slice(0, 5)
            .map((line) => line.split(/\s+/).slice(0, 5).join(" ")),
    };
}
