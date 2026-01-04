import {
    formatSize,
    formatTime,
    makeProgressBar,
    getOSInfo,
    getCPUInfo,
    getMemoryInfo,
    getDiskInfo,
    getNetworkInfo,
    getProcessInfo,
    getContainerInfo,
    getSystemLoad,
    getWarnings,
    getHeapInfo,
    getServiceInfo,
    getUserInfo,
    getSoftwareVersions,
    getRedisInfo,
    getPostgresInfo,
    getRustInfo
} from "#lib/system.js";

let handler = async (m, { conn }) => {
    const startTime = Date.now();
    const [
        osInfo,
        cpuInfo,
        memoryInfo,
        diskInfo,
        networkInfo,
        processInfo,
        containerInfo,
        systemLoad,
        heapInfo,
        serviceInfo,
        userInfo,
        softwareVersions,
        redisInfo,
        postgresInfo,
        rustInfo
    ] = await Promise.all([
        getOSInfo(),
        getCPUInfo(),
        getMemoryInfo(),
        getDiskInfo(),
        getNetworkInfo(),
        getProcessInfo(),
        getContainerInfo(),
        getSystemLoad(),
        getHeapInfo(),
        getServiceInfo(),
        getUserInfo(),
        getSoftwareVersions(),
        getRedisInfo(),
        getPostgresInfo(),
        getRustInfo()
    ]);
    const collectionTime = Date.now() - startTime;
    const warnings = await getWarnings(cpuInfo, memoryInfo, diskInfo, processInfo);
    const memUsage = memoryInfo.total > 0 ? (memoryInfo.used / memoryInfo.total * 100).toFixed(1) : "0.0";
    const swapUsage = memoryInfo.swapTotal > 0 ? (memoryInfo.swapUsed / memoryInfo.swapTotal * 100).toFixed(1) : "0.0";
    const diskUsage = diskInfo.total.size > 0 ? (diskInfo.total.used / diskInfo.total.size * 100).toFixed(1) : "0.0";
    const memBar = makeProgressBar(memoryInfo.used, memoryInfo.total);
    const swapBar = memoryInfo.swapTotal > 0 ? makeProgressBar(memoryInfo.swapUsed, memoryInfo.swapTotal) : "";
    const diskBar = makeProgressBar(diskInfo.total.used, diskInfo.total.size);
    const heapBar = makeProgressBar(heapInfo.rss, memoryInfo.total);
    console.log('Redis Info:', redisInfo);
    console.log('Postgres Info:', postgresInfo);
    console.log('Rust Info:', rustInfo);
    const message = `
\`\`\`
━━━ SYSTEM INFORMATION ━━━ 
OS: ${osInfo.name}
Kernel: ${osInfo.kernel}
Hostname: ${containerInfo.hostname}
Container: ${containerInfo.isContainer ? `${containerInfo.type} (${containerInfo.id || "N/A"})` : "No"}
System Uptime: ${formatTime(processInfo.uptime)}
Data Collection: ${collectionTime}ms

━━━ SOFTWARE VERSIONS ━━━ 
Runtime:
Bun: v${softwareVersions.bun}
Node.js: v${softwareVersions.node}
NPM: ${softwareVersions.npm}

Databases:
Redis: ${redisInfo}
PostgreSQL: ${postgresInfo}

Programming Languages:
Rust: ${rustInfo}

━━━ CPU INFORMATION ━━━
Model: ${cpuInfo.model}
Cores: ${cpuInfo.cores} @ ${cpuInfo.speed}
Architecture: ${cpuInfo.architecture}
Current Usage: ${cpuInfo.usage}%

Load Average:
1 minute: ${cpuInfo.load1} (${cpuInfo.load1Pct}%)
5 minutes: ${cpuInfo.load5} (${cpuInfo.load5Pct}%)
15 minutes: ${cpuInfo.load15} (${cpuInfo.load15Pct}%)

CPU States (vmstat):
User: ${systemLoad.cpu.us}%
System: ${systemLoad.cpu.sy}%
Idle: ${systemLoad.cpu.id}%
Wait I/O: ${systemLoad.cpu.wa}%
Steal: ${systemLoad.cpu.st}%

━━━ MEMORY INFORMATION ━━━
Physical RAM:
Total: ${formatSize(memoryInfo.total)}
Used: ${formatSize(memoryInfo.used)} (${memUsage}%)
Free: ${formatSize(memoryInfo.free)}
Available: ${formatSize(memoryInfo.available)}
Buffers: ${formatSize(memoryInfo.buffers)}
Cached: ${formatSize(memoryInfo.cached)}
Active/Inactive: ${formatSize(memoryInfo.active)}/${formatSize(memoryInfo.inactive)}
${memBar}

Swap Memory:
Total: ${formatSize(memoryInfo.swapTotal)}
Used: ${formatSize(memoryInfo.swapUsed)} (${swapUsage}%)
Free: ${formatSize(memoryInfo.swapFree)}
Cached: ${formatSize(memoryInfo.swapCached)}
${swapBar}

━━━ PROCESS MEMORY ━━━
RSS (Resident): ${formatSize(heapInfo.rss)}
Heap Used: ${formatSize(heapInfo.heapUsed)}
Heap Total: ${formatSize(heapInfo.heapTotal)}
External: ${formatSize(heapInfo.external)}
Array Buffers: ${formatSize(heapInfo.arrayBuffers)}
Memory Efficiency: ${((heapInfo.heapUsed / heapInfo.rss) * 100).toFixed(1)}% heap of RSS
${heapBar}

━━━ DISK INFORMATION ━━━
Root Filesystem:
Total: ${formatSize(diskInfo.total.size)}
Used: ${formatSize(diskInfo.total.used)} (${diskUsage}%)
Free: ${formatSize(diskInfo.total.available)}
Mounts: ${diskInfo.disks.length}
${diskBar}

Disk I/O Statistics:
Read: ${formatSize(diskInfo.io.readBytes)} (${diskInfo.io.readOps} ops)
Write: ${formatSize(diskInfo.io.writeBytes)} (${diskInfo.io.writeOps} ops)

Top 3 Mounts:
${diskInfo.disks.slice(0, 3).map(disk => 
`${disk.mountpoint}: ${formatSize(disk.used)}/${formatSize(disk.size)} (${((disk.used/disk.size)*100).toFixed(1)}%)`
).join('\n')}

━━━ NETWORK INFORMATION ━━━
Total Traffic:
Received: ${formatSize(networkInfo.total.rxBytes)} (${networkInfo.total.rxPackets} packets)
Transmitted: ${formatSize(networkInfo.total.txBytes)} (${networkInfo.total.txPackets} packets)

Network Statistics:
Interfaces: ${networkInfo.interfaces.length}
Connections: ${networkInfo.connections}
DNS Servers: ${networkInfo.dnsServers.join(', ') || 'Default'}
Context Switches: ${processInfo.contextSwitches.toLocaleString()}

Top 3 Interfaces:
${networkInfo.interfaces.slice(0, 3).map(iface => 
`${iface.name}: ▼${formatSize(iface.rxBytes)} ▲${formatSize(iface.txBytes)}`
).join('\n')}

━━━ PROCESS INFORMATION ━━━
Process Summary:
Total: ${processInfo.total}
Running: ${processInfo.running}
Sleeping: ${processInfo.sleeping}
Stopped: ${processInfo.stopped}
Zombies: ${processInfo.zombies}
Threads: ${processInfo.threads}
Load Averages: ${processInfo.load1}, ${processInfo.load5}, ${processInfo.load15}

VMStat Processes:
Running: ${systemLoad.procs.r}
Blocked: ${systemLoad.procs.b}

${serviceInfo.services.length > 0 ? `
━━━ SERVICE INFORMATION ━━━
Running Services: ${serviceInfo.total}
${serviceInfo.services.map(svc => 
`${svc.name}
Status: ${svc.status}
Active: ${svc.active}
${svc.memory ? `Memory: ${svc.memory}` : ''}
${svc.cpu ? `CPU: ${svc.cpu}` : ''}`
).join('\n\n')}` : ''}

━━━ USER INFORMATION ━━━
Logged In Users: ${userInfo.loggedIn}
${userInfo.recentLogins.length > 0 ? 
`Recent Logins:\n${userInfo.recentLogins.map(login => `${login}`).join('\n')}` : 
'No recent logins'}
${warnings.length > 0 ? `
━━━ WARNINGS (${warnings.length}) ━━━
${warnings.map((w, i) => `${i + 1}. ${w}`).join('\n')}
` : ''}
Collection Time: ${collectionTime}ms
Report Generated: ${new Date().toLocaleString('en-US', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    timeZoneName: 'short'
})}
System Status: ${warnings.length === 0 ? '✓ HEALTHY' : '✘ ATTENTION REQUIRED'}
\`\`\`
`.trim();

    await conn.sendMessage(m.chat, {
        text: message,
        contextInfo: {
            externalAdReply: {
                title: "System Monitoring Report",
                body: `Status: ${warnings.length === 0 ? 'Healthy' : `${warnings.length} Warnings`}`,
                thumbnailUrl: "https://files.catbox.moe/2tswt7.jpg",
                mediaType: 1,
                renderLargerThumbnail: true,
            },
        },
    }, { quoted: m });
};

handler.help = ["os"];
handler.tags = ["info"];
handler.command = /^(os)$/i;

export default handler;