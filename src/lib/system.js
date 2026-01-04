import { $ } from "bun";

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

export async function getOSInfo() {
  try {
    const osRelease =
      await $`cat /etc/os-release 2>/dev/null || echo ""`.text();
    const kernel = await $`uname -r 2>/dev/null || echo ""`.text();

    let osData = {
      name: "",
      version: "",
      kernel: kernel.trim(),
    };

    if (osRelease) {
      const info = Object.fromEntries(
        osRelease
          .split("\n")
          .filter((line) => line.includes("="))
          .map((line) => {
            const [key, ...value] = line.split("=");
            return [key.trim(), value.join("=").replace(/"/g, "").trim()];
          }),
      );

      osData.name = info.PRETTY_NAME || info.NAME || "Unknown";
      osData.version = info.VERSION_ID || "unknown";
    } else {
      const uname = await $`uname -srmo 2>/dev/null || echo ""`.text();
      osData.name = uname.trim();
      osData.version = kernel.trim();
    }

    return osData;
  } catch {
    return {
      name: "Unknown System",
      version: "unknown",
      kernel: "unknown",
    };
  }
}

export async function getRedisInfo() {
  try {
    const version =
      await $`redis-server --version | awk '{print $3}' | cut -d= -f2`.text();
    return version.trim() || "Not installed";
  } catch {
    return "Not installed";
  }
}

export async function getPostgresInfo() {
  try {
    const version = await $`psql -V | awk '{print $3}'`.text();
    return version.trim() || "Not installed";
  } catch {
    return "Not installed";
  }
}

export async function getRustInfo() {
  try {
    const version = await $`rustc --version | awk '{print $2}'`.text();
    return version.trim() || "Not installed";
  } catch {
    return "Not installed";
  }
}

export async function getSoftwareVersions() {
  const [nodeVersion, bunVersion] = await Promise.all([
    $`node --version 2>/dev/null || echo ""`.text(),
    $`bun --version 2>/dev/null || echo ""`.text(),
  ]);

  return {
    node: nodeVersion
      .trim()
      .replace("v", "")
      .replace("Not installed", "Not installed"),
    bun: bunVersion.trim().replace("Not installed", "Not installed"),
    npm: await $`npm --version 2>/dev/null || echo ""`
      .text()
      .then((t) => t.trim()),
  };
}

export async function getCPUInfo() {
  try {
    const cpuInfo = await $`cat /proc/cpuinfo 2>/dev/null || echo ""`.text();
    const loadAvg =
      await $`cat /proc/loadavg 2>/dev/null || echo "0 0 0"`.text();

    let model = "Unknown";
    let cores = 0;
    let mhz = 0;

    if (cpuInfo) {
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
      }
    }

    if (cores === 0) {
      try {
        cores = parseInt(await $`nproc`.text()) || 1;
      } catch {
        cores = 1;
      }
    }

    const loads = loadAvg.split(/\s+/).slice(0, 3).map(Number);
    const loadPercent = (load) =>
      cores > 0 ? ((load / cores) * 100).toFixed(2) : "0.00";

    let usage = "0.00";
    try {
      const stat = await $`cat /proc/stat`.text();
      const cpuLine = stat.split("\n")[0];
      const values = cpuLine.split(/\s+/).slice(1).map(Number);
      const idle = values[3];
      const total = values.reduce((a, b) => a + b, 0);

      if (global._prevCPU) {
        const idleDelta = idle - global._prevCPU.idle;
        const totalDelta = total - global._prevCPU.total;
        usage =
          totalDelta > 0
            ? (((totalDelta - idleDelta) * 100) / totalDelta).toFixed(2)
            : "0.00";
      }

      global._prevCPU = { idle, total };
    } catch (error) {
      usage = "0.00";
    }

    return {
      model: model.replace(/\s+/g, " "),
      cores,
      speed: mhz ? `${mhz.toFixed(2)} MHz` : "Unknown",
      load1: loads[0]?.toFixed(2) || "0.00",
      load5: loads[1]?.toFixed(2) || "0.00",
      load15: loads[2]?.toFixed(2) || "0.00",
      load1Pct: loadPercent(loads[0]),
      load5Pct: loadPercent(loads[1]),
      load15Pct: loadPercent(loads[2]),
      usage: usage,
      architecture: await $`uname -m`.text().then((t) => t.trim()),
    };
  } catch (error) {
    return {
      model: "Unknown",
      cores: 1,
      speed: "Unknown",
      load1: "0.00",
      load5: "0.00",
      load15: "0.00",
      load1Pct: "0.00",
      load5Pct: "0.00",
      load15Pct: "0.00",
      usage: "0.00",
      architecture: "unknown",
    };
  }
}

export async function getMemoryInfo() {
  try {
    const memInfo = await $`cat /proc/meminfo`.text();
    const memLines = memInfo.split("\n");

    let memTotal = 0,
      memFree = 0,
      memAvailable = 0,
      buffers = 0,
      cached = 0;
    let swapTotal = 0,
      swapFree = 0,
      swapCached = 0;

    for (const line of memLines) {
      const [key, value] = line.split(":").map((s) => s.trim());
      const numValue = parseInt(value) * 1024;

      switch (key) {
        case "MemTotal":
          memTotal = numValue;
          break;
        case "MemFree":
          memFree = numValue;
          break;
        case "MemAvailable":
          memAvailable = numValue;
          break;
        case "Buffers":
          buffers = numValue;
          break;
        case "Cached":
          cached = numValue;
          break;
        case "SwapTotal":
          swapTotal = numValue;
          break;
        case "SwapFree":
          swapFree = numValue;
          break;
        case "SwapCached":
          swapCached = numValue;
          break;
      }
    }

    const memUsed = memTotal - memAvailable;
    const swapUsed = swapTotal - swapFree;

    let active = 0,
      inactive = 0,
      dirty = 0,
      writeback = 0;
    try {
      const vmstat = await $`cat /proc/vmstat 2>/dev/null`.text();
      const lines = vmstat.split("\n");
      for (const line of lines) {
        if (line.startsWith("nr_active_file"))
          active = parseInt(line.split(" ")[1]) * 4096;
        if (line.startsWith("nr_inactive_file"))
          inactive = parseInt(line.split(" ")[1]) * 4096;
        if (line.startsWith("nr_dirty"))
          dirty = parseInt(line.split(" ")[1]) * 4096;
        if (line.startsWith("nr_writeback"))
          writeback = parseInt(line.split(" ")[1]) * 4096;
      }
    } catch {
      //
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
  } catch (error) {
    return {
      total: 0,
      used: 0,
      free: 0,
      available: 0,
      buffers: 0,
      cached: 0,
      swapTotal: 0,
      swapUsed: 0,
      swapFree: 0,
      swapCached: 0,
      active: 0,
      inactive: 0,
      dirty: 0,
      writeback: 0,
      shmem: 0,
      slab: 0,
    };
  }
}

export async function getDiskInfo() {
  try {
    const dfOutput =
      await $`df -B1 --output=source,fstype,size,used,avail,pcent,target,itotal,iused,iavail,ipcent 2>/dev/null || df -k`.text();
    const lines = dfOutput.trim().split("\n").slice(1);

    const disks = [];
    let totalSize = 0,
      totalUsed = 0,
      totalAvailable = 0;

    for (const line of lines) {
      const parts = line.trim().split(/\s+/);
      if (parts.length >= 6) {
        const size =
          parseInt(parts[2]) *
          (parts[2].includes("T")
            ? 1024 * 1024 * 1024 * 1024
            : parts[2].includes("G")
              ? 1024 * 1024 * 1024
              : parts[2].includes("M")
                ? 1024 * 1024
                : parts[2].includes("K")
                  ? 1024
                  : 1);
        const used =
          parseInt(parts[3]) *
          (parts[3].includes("T")
            ? 1024 * 1024 * 1024 * 1024
            : parts[3].includes("G")
              ? 1024 * 1024 * 1024
              : parts[3].includes("M")
                ? 1024 * 1024
                : parts[3].includes("K")
                  ? 1024
                  : 1);
        const avail =
          parseInt(parts[4]) *
          (parts[4].includes("T")
            ? 1024 * 1024 * 1024 * 1024
            : parts[4].includes("G")
              ? 1024 * 1024 * 1024
              : parts[4].includes("M")
                ? 1024 * 1024
                : parts[4].includes("K")
                  ? 1024
                  : 1);

        disks.push({
          filesystem: parts[0],
          type: parts[1] || "unknown",
          size,
          used,
          available: avail,
          mountpoint: parts[6] || "/",
          inodesTotal: parseInt(parts[7]) || 0,
          inodesUsed: parseInt(parts[8]) || 0,
          inodesAvailable: parseInt(parts[9]) || 0,
        });

        totalSize += size;
        totalUsed += used;
        totalAvailable += avail;
      }
    }

    let ioStats = { readBytes: 0, writeBytes: 0, readOps: 0, writeOps: 0 };
    try {
      const diskstats = await $`cat /proc/diskstats 2>/dev/null`.text();
      const lines = diskstats.split("\n");
      for (const line of lines) {
        const parts = line.trim().split(/\s+/);
        if (parts.length >= 14) {
          ioStats.readBytes += parseInt(parts[5]) * 512;
          ioStats.writeBytes += parseInt(parts[9]) * 512;
          ioStats.readOps += parseInt(parts[3]);
          ioStats.writeOps += parseInt(parts[7]);
        }
      }
    } catch {
      //
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
  } catch (error) {
    return {
      disks: [],
      total: { size: 0, used: 0, available: 0 },
      io: { readBytes: 0, writeBytes: 0, readOps: 0, writeOps: 0 },
    };
  }
}

export async function getNetworkInfo() {
  try {
    const netDev = await $`cat /proc/net/dev 2>/dev/null`.text();
    const lines = netDev.split("\n").slice(2);

    let totalRx = 0,
      totalTx = 0;
    let totalRxPackets = 0,
      totalTxPackets = 0;
    const interfaces = [];

    for (const line of lines) {
      if (!line.trim() || line.includes("lo:")) continue;

      const parts = line.trim().split(/\s+/);
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

    let connections = 0;
    try {
      const connOutput = await $`ss -tun state connected | wc -l`.text();
      connections = parseInt(connOutput.trim()) - 1;
    } catch (error) {
      connections = 0;
    }

    let dnsServers = [];
    try {
      const resolv =
        await $`cat /etc/resolv.conf 2>/dev/null | grep nameserver`.text();
      dnsServers = resolv
        .split("\n")
        .filter((line) => line.includes("nameserver"))
        .map((line) => line.split(/\s+/)[1])
        .filter(Boolean);
    } catch (error) {
      dnsServers = [];
    }

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
  } catch (error) {
    return {
      total: { rxBytes: 0, txBytes: 0, rxPackets: 0, txPackets: 0 },
      interfaces: [],
      connections: 0,
      dnsServers: [],
    };
  }
}

export async function getProcessInfo() {
  try {
    const uptimeStr = await $`cat /proc/uptime`.text();
    const uptimeSeconds = parseFloat(uptimeStr.split(" ")[0]);

    const processCount = await $`ps -e --no-headers | wc -l`.text();

    const loadAvg = await $`cat /proc/loadavg`.text();
    const loads = loadAvg.split(" ").slice(0, 3).map(Number);

    const zombies =
      await $`ps aux | grep 'defunct' | grep -v grep | wc -l`.text();

    const running = await $`ps -e -o stat | grep R | wc -l`.text();
    const sleeping = await $`ps -e -o stat | grep S | wc -l`.text();
    const stopped = await $`ps -e -o stat | grep T | wc -l`.text();

    return {
      total: parseInt(processCount.trim()),
      running: parseInt(running.trim()),
      sleeping: parseInt(sleeping.trim()),
      stopped: parseInt(stopped.trim()),
      zombies: parseInt(zombies.trim()),
      uptime: uptimeSeconds,
      load1: loads[0] || 0,
      load5: loads[1] || 0,
      load15: loads[2] || 0,
      threads: await $`ps -eL --no-headers | wc -l`
        .text()
        .then((t) => parseInt(t.trim())),
      contextSwitches: await $`cat /proc/stat | grep ctxt`
        .text()
        .then((t) => parseInt(t.split(" ")[1]) || 0),
    };
  } catch (error) {
    return {
      total: 0,
      running: 0,
      sleeping: 0,
      stopped: 0,
      zombies: 0,
      uptime: 0,
      load1: 0,
      load5: 0,
      load15: 0,
      threads: 0,
      contextSwitches: 0,
    };
  }
}

export async function getContainerInfo() {
  try {
    const inContainer =
      await $`cat /proc/1/cgroup 2>/dev/null | grep -q docker || echo $?`.text();
    const isDocker = inContainer.trim() === "0";

    const isLxc =
      await $`cat /proc/1/environ 2>/dev/null | tr '\\0' '\\n' | grep -q container=lxc || echo $?`.text();

    let containerType = "None";
    let containerId = "";

    if (isDocker) {
      containerType = "Docker";
      containerId =
        await $`cat /proc/self/cgroup | grep "docker" | head -1 | cut -d/ -f3`
          .text()
          .then((t) => t.trim().slice(0, 12));
    } else if (isLxc === "0") {
      containerType = "LXC";
    }

    const hasKube = await $`env | grep -q KUBERNETES_SERVICE || echo $?`.text();
    if (hasKube === "0") {
      containerType = "Kubernetes";
    }

    const containerHostname = await $`hostname`.text();

    return {
      type: containerType,
      id: containerId,
      hostname: containerHostname.trim(),
      isContainer: containerType !== "None",
    };
  } catch (error) {
    return {
      type: "Unknown",
      id: "",
      hostname: "",
      isContainer: false,
    };
  }
}

export async function getSystemLoad() {
  try {
    const header = await $`vmstat`.text();
    const headerLines = header.split("\n");
    const data = await $`vmstat 1 2 | tail -1`.text();
    const parts = data
      .trim()
      .split(/\s+/)
      .filter((p) => p !== "");
    if (parts.length >= 12) {
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
          sy:
            cpuIndex + 1 < parts.length
              ? parseInt(parts[cpuIndex + 1]) || 0
              : 0,
          id:
            cpuIndex + 2 < parts.length
              ? parseInt(parts[cpuIndex + 2]) || 0
              : 100,
          wa:
            cpuIndex + 3 < parts.length
              ? parseInt(parts[cpuIndex + 3]) || 0
              : 0,
          st:
            cpuIndex + 4 < parts.length
              ? parseInt(parts[cpuIndex + 4]) || 0
              : 0,
        },
      };
    }

    throw new Error("Unexpected vmstat format");
  } catch {
    return {
      procs: { r: 0, b: 0 },
      memory: { swpd: 0, free: 0, buff: 0, cache: 0 },
      swap: { si: 0, so: 0 },
      io: { bi: 0, bo: 0 },
      system: { in: 0, cs: 0 },
      cpu: { us: 0, sy: 0, id: 100, wa: 0, st: 0 },
    };
  }
}

export async function getWarnings(cpu, memory, disk, processes) {
  const warnings = [];

  const cpuLoad1 = parseFloat(cpu.load1Pct);
  if (cpuLoad1 > 90) {
    warnings.push("⚠︎ CRITICAL: CPU load >90% - System overload!");
  } else if (cpuLoad1 > 70) {
    warnings.push("⚠︎ WARNING: High CPU load >70%");
  }

  const memUsage = (memory.used / memory.total) * 100;
  if (memUsage > 95) {
    warnings.push("⚠︎ CRITICAL: Memory usage >95% - OOM risk!");
  } else if (memUsage > 85) {
    warnings.push("⚠︎ WARNING: High memory usage >85%");
  }

  if (memory.swapTotal > 0) {
    const swapUsage = (memory.swapUsed / memory.swapTotal) * 100;
    if (swapUsage > 50) {
      warnings.push("⚠︎ WARNING: High swap usage >50%");
    }
  }

  const diskUsage = (disk.total.used / disk.total.size) * 100;
  if (diskUsage > 95) {
    warnings.push("⚠︎ CRITICAL: Disk usage >95% - Cleanup needed!");
  } else if (diskUsage > 85) {
    warnings.push("⚠︎ WARNING: High disk usage >85%");
  }

  if (processes.zombies > 10) {
    warnings.push("⚠︎ WARNING: Many zombie processes (>10)");
  }

  return warnings;
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

export async function getServiceInfo() {
  try {
    const detailedServices = [];
    const importantServices = ["liora", "postgresql", "redis", "ssh"];

    for (const service of importantServices) {
      try {
        const status =
          await $`systemctl is-active ${service} 2>/dev/null || echo "inactive"`.text();
        if (status.trim() === "active") {
          const info =
            await $`systemctl status ${service} --no-pager 2>/dev/null || echo ""`.text();
          if (info) {
            const lines = info.split("\n");
            const nameLine = lines.find((l) => l.includes(".service - "));
            const activeLine = lines.find((l) => l.includes("Active:"));
            const memoryLine = lines.find((l) => l.includes("Memory:"));
            const cpuLine = lines.find((l) => l.includes("CPU:"));

            if (nameLine) {
              const serviceName = nameLine.split(".service - ")[0].trim();
              const description =
                nameLine.split(".service - ")[1]?.trim() || "";

              detailedServices.push({
                name: serviceName,
                description: description.substring(0, 50),
                status: "active",
                active:
                  activeLine?.split("Active: ")[1]?.split(";")[0]?.trim() || "",
                memory: memoryLine?.split("Memory: ")[1]?.trim() || "",
                cpu: cpuLine?.split("CPU: ")[1]?.trim() || "",
              });
            }
          }
        }
      } catch {
        continue;
      }
    }

    return {
      total: detailedServices.length,
      services: detailedServices,
    };
  } catch (error) {
    return {
      total: 0,
      services: [],
    };
  }
}

export async function getUserInfo() {
  try {
    const users = await $`who | wc -l`.text();
    const lastLogin = await $`last -n 5`.text();

    return {
      loggedIn: parseInt(users.trim()),
      recentLogins: lastLogin
        .split("\n")
        .filter((line) => line.trim() && !line.startsWith("wtmp"))
        .slice(0, 5)
        .map((line) => line.split(/\s+/).slice(0, 5).join(" ")),
    };
  } catch (error) {
    return {
      loggedIn: 0,
      recentLogins: [],
    };
  }
}
