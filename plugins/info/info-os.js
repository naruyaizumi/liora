import {
    getOSPrettyName,
    getCPUInfo,
    getCPUUsageSinceBoot,
    getRAMInfo,
    getDiskUsage,
    getHeapInfo,
    getProcessInfo,
    getNetworkStats,
    getKernelInfo,
    getSystemUptime,
    getWarnings,
    formatTime,
} from "../../lib/system-info.js";

import { canvas } from "../../lib/canvas-os.js";

let handler = async (m, { conn }) => {
    try {
        await global.loading(m, conn);
        
        const osInfo = await getOSPrettyName();
        const kernel = await getKernelInfo();
        const cpu = await getCPUInfo();
        const cpuBootUsage = await getCPUUsageSinceBoot();
        const ram = await getRAMInfo();
        const disk = await getDiskUsage();
        const heap = getHeapInfo();
        const proc = getProcessInfo();
        const network = await getNetworkStats();

        const uptimeBot = formatTime(process.uptime());
        const uptimeSys = await getSystemUptime();

        const warnings = getWarnings(cpu, ram, disk);

        const systemData = {
            osInfo,
            kernel,
            cpu,
            cpuBootUsage,
            ram,
            disk,
            heap,
            proc,
            network,
            uptimeBot,
            uptimeSys,
            warnings,
        };

        const imageBuffer = await canvas(systemData);

        await conn.sendMessage(
            m.chat,
            {
                image: imageBuffer,
                caption:
                    `*SYSTEM MONITOR REPORT*\n\n` +
                    `*Host:* ${kernel.hostname}\n` +
                    `*System Uptime:* ${uptimeSys}\n` +
                    `*Bot Uptime:* ${uptimeBot}\n` +
                    (warnings.length > 0 ? `\n⚠️ *Warnings:* ${warnings.join(", ")}` : ""),
            },
            { quoted: m }
        );
    } catch (e) {
        conn.logger.error(e);
        m.reply(`Error: ${e.message}`);
    } finally {
        await global.loading(m, conn, true);
    }
};

handler.help = ["os"];
handler.tags = ["info"];
handler.command = /^(os)$/i;

export default handler;