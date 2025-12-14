import { createCanvas, loadImage, GlobalFonts } from "@napi-rs/canvas";
import { formatSize } from "./system-info.js";
import { join } from "path";

GlobalFonts.registerFromPath(join(process.cwd(), "lib", "Cobbler-SemiBold.ttf"), "Cobbler");

const colors = {
    bg: "#0a0e17",
    cardBg: "rgba(22, 27, 34, 0.4)",
    cardBgLight: "rgba(28, 33, 40, 0.3)",
    border: "rgba(48, 54, 61, 0.5)",
    borderLight: "rgba(72, 79, 88, 0.3)",
    text: "#e6edf3",
    textMuted: "#8b949e",
    accent: "#58a6ff",
    accentGlow: "rgba(88, 166, 255, 0.5)",
    success: "#3fb950",
    successGlow: "rgba(63, 185, 80, 0.5)",
    warning: "#d29922",
    warningGlow: "rgba(210, 153, 34, 0.5)",
    danger: "#f85149",
    dangerGlow: "rgba(248, 81, 73, 0.5)",
    purple: "#bc8cff",
    purpleGlow: "rgba(188, 140, 255, 0.5)",
    orange: "#ff9500",
    orangeGlow: "rgba(255, 149, 0, 0.5)",
    glass: "rgba(255, 255, 255, 0.05)",
    glassStroke: "rgba(255, 255, 255, 0.1)",
};

function drawRoundedRect(ctx, x, y, width, height, radius) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
}

function drawGlassCard(ctx, x, y, width, height, radius) {
    ctx.save();
    
    const gradient = ctx.createLinearGradient(x, y, x, y + height);
    gradient.addColorStop(0, colors.glass);
    gradient.addColorStop(1, "rgba(255, 255, 255, 0.02)");
    ctx.fillStyle = gradient;
    drawRoundedRect(ctx, x, y, width, height, radius);
    ctx.fill();
    
    ctx.strokeStyle = colors.glassStroke;
    ctx.lineWidth = 1.5;
    drawRoundedRect(ctx, x, y, width, height, radius);
    ctx.stroke();
    
    ctx.restore();
}

function drawProgressBar(ctx, x, y, width, height, percentage, color, glowColor, label, subtext) {
    const barHeight = 12;
    const barY = y + height - barHeight - 20;
    
    drawGlassCard(ctx, x, y, width, height, 16);
    
    ctx.save();
    ctx.shadowColor = glowColor;
    ctx.shadowBlur = 15;
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(x + 15, y);
    ctx.lineTo(x + width - 15, y);
    ctx.stroke();
    ctx.restore();
    
    ctx.fillStyle = colors.textMuted;
    ctx.font = "bold 13px Cobbler";
    ctx.textAlign = "left";
    ctx.fillText(label, x + 20, y + 30);
    
    ctx.save();
    ctx.shadowColor = glowColor;
    ctx.shadowBlur = 12;
    ctx.fillStyle = colors.text;
    ctx.font = "bold 28px Cobbler";
    ctx.textAlign = "right";
    ctx.fillText(`${percentage.toFixed(1)}%`, x + width - 20, y + 50);
    ctx.restore();
    
    if (subtext) {
        ctx.fillStyle = colors.textMuted;
        ctx.font = "12px Cobbler";
        ctx.textAlign = "left";
        ctx.fillText(subtext, x + 20, y + 70);
    }
    
    ctx.fillStyle = "rgba(255, 255, 255, 0.05)";
    drawRoundedRect(ctx, x + 20, barY, width - 40, barHeight, barHeight / 2);
    ctx.fill();
    
    const fillWidth = ((width - 40) * percentage) / 100;
    if (fillWidth > 0) {
        ctx.save();
        ctx.shadowColor = glowColor;
        ctx.shadowBlur = 20;
        
        const barGradient = ctx.createLinearGradient(x + 20, barY, x + 20 + fillWidth, barY);
        barGradient.addColorStop(0, color);
        barGradient.addColorStop(1, color + "cc");
        ctx.fillStyle = barGradient;
        drawRoundedRect(ctx, x + 20, barY, fillWidth, barHeight, barHeight / 2);
        ctx.fill();
        ctx.restore();
    }
}

async function drawInfoCard(ctx, x, y, width, height, iconUrl, label, value, subtext, accentColor, glowColor) {
    drawGlassCard(ctx, x, y, width, height, 16);
    
    ctx.save();
    ctx.shadowColor = glowColor;
    ctx.shadowBlur = 15;
    ctx.strokeStyle = accentColor;
    ctx.lineWidth = 3;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(x + 15, y);
    ctx.lineTo(x + width - 15, y);
    ctx.stroke();
    ctx.restore();
    
    const iconSize = 42;
    const iconX = x + 20;
    const iconY = y + height / 2 - iconSize / 2;
    
    try {
        const icon = await loadImage(iconUrl);
        ctx.save();
        ctx.shadowColor = glowColor;
        ctx.shadowBlur = 20;
        ctx.drawImage(icon, iconX, iconY, iconSize, iconSize);
        ctx.restore();
    } catch {
        ctx.save();
        ctx.shadowColor = glowColor;
        ctx.shadowBlur = 20;
        ctx.fillStyle = accentColor;
        ctx.font = "bold 28px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("●", iconX + iconSize / 2, iconY + iconSize / 2);
        ctx.restore();
    }
    
    ctx.fillStyle = colors.textMuted;
    ctx.font = "bold 13px Cobbler";
    ctx.textAlign = "left";
    ctx.fillText(label, x + 75, y + 28);
    
    ctx.save();
    ctx.shadowColor = glowColor;
    ctx.shadowBlur = 10;
    ctx.fillStyle = colors.text;
    ctx.font = "bold 20px Cobbler";
    ctx.fillText(value, x + 75, y + 52);
    ctx.restore();
    
    if (subtext) {
        ctx.fillStyle = colors.textMuted;
        ctx.font = "12px Cobbler";
        ctx.fillText(subtext, x + 75, y + 72);
    }
}

export async function canvas(systemData, options = {}) {
    const size = 1200;
    const canvas = createCanvas(size, size);
    const ctx = canvas.getContext("2d");
    
    const bgGradient = ctx.createRadialGradient(600, 600, 0, 600, 600, 850);
    bgGradient.addColorStop(0, "#12161f");
    bgGradient.addColorStop(0.5, colors.bg);
    bgGradient.addColorStop(1, "#080a0f");
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, size, size);
    
    ctx.save();
    ctx.globalAlpha = 0.03;
    for (let i = 0; i < 25; i++) {
        ctx.strokeStyle = colors.accent;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(600, 600, 50 + i * 35, 0, Math.PI * 2);
        ctx.stroke();
    }
    ctx.restore();
    
    ctx.save();
    ctx.globalAlpha = 0.02;
    const corner1 = ctx.createRadialGradient(150, 150, 0, 150, 150, 400);
    corner1.addColorStop(0, colors.accent);
    corner1.addColorStop(1, "transparent");
    ctx.fillStyle = corner1;
    ctx.fillRect(0, 0, 600, 600);
    
    const corner2 = ctx.createRadialGradient(1050, 1050, 0, 1050, 1050, 400);
    corner2.addColorStop(0, colors.purple);
    corner2.addColorStop(1, "transparent");
    ctx.fillStyle = corner2;
    ctx.fillRect(600, 600, 600, 600);
    ctx.restore();
    
    ctx.save();
    ctx.shadowColor = colors.accentGlow;
    ctx.shadowBlur = 25;
    ctx.fillStyle = colors.text;
    ctx.font = "bold 42px Cobbler";
    ctx.fillText("SYSTEM MONITOR", 40, 58);
    ctx.restore();
    
    ctx.fillStyle = colors.textMuted;
    ctx.font = "15px Cobbler";
    ctx.fillText("Real-time Performance Dashboard", 40, 85);
    
    ctx.textAlign = "right";
    ctx.fillStyle = colors.textMuted;
    ctx.font = "13px Cobbler";
    ctx.fillText(new Date().toLocaleString("id-ID"), 1160, 68);
    ctx.textAlign = "left";
    
    const dividerGradient = ctx.createLinearGradient(40, 105, 1160, 105);
    dividerGradient.addColorStop(0, "transparent");
    dividerGradient.addColorStop(0.5, colors.accent);
    dividerGradient.addColorStop(1, "transparent");
    ctx.save();
    ctx.shadowColor = colors.accentGlow;
    ctx.shadowBlur = 15;
    ctx.strokeStyle = dividerGradient;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(40, 105);
    ctx.lineTo(1160, 105);
    ctx.stroke();
    ctx.restore();
    
    let yPos = 140;
    
    const cpuPct = parseFloat(systemData.cpu.load1Pct);
    const ramPct = systemData.ram.ramTotal > 0 ? (systemData.ram.ramUsed / systemData.ram.ramTotal) * 100 : 0;
    const diskPct = systemData.disk.total > 0 ? (systemData.disk.used / systemData.disk.total) * 100 : 0;
    const heapPct = systemData.heap.heapTotal > 0 ? (systemData.heap.heapUsed / systemData.heap.heapTotal) * 100 : 0;
    
    const barWidth = 560;
    const barHeight = 120;
    const barSpacing = 40;
    
    drawProgressBar(
        ctx,
        40,
        yPos,
        barWidth,
        barHeight,
        Math.min(cpuPct, 100),
        colors.orange,
        colors.orangeGlow,
        "CPU LOAD",
        `${systemData.cpu.cores} Cores • ${systemData.cpu.speed} MHz`
    );
    
    drawProgressBar(
        ctx,
        40 + barWidth + barSpacing,
        yPos,
        barWidth,
        barHeight,
        ramPct,
        colors.accent,
        colors.accentGlow,
        "MEMORY",
        formatSize(systemData.ram.ramTotal)
    );
    
    yPos += barHeight + 30;
    
    drawProgressBar(
        ctx,
        40,
        yPos,
        barWidth,
        barHeight,
        diskPct,
        colors.purple,
        colors.purpleGlow,
        "STORAGE",
        formatSize(systemData.disk.total)
    );
    
    drawProgressBar(
        ctx,
        40 + barWidth + barSpacing,
        yPos,
        barWidth,
        barHeight,
        heapPct,
        colors.warning,
        colors.warningGlow,
        "HEAP MEMORY",
        formatSize(systemData.heap.heapTotal)
    );
    
    yPos += barHeight + 50;
    
    ctx.save();
    ctx.shadowColor = colors.accentGlow;
    ctx.shadowBlur = 15;
    ctx.fillStyle = colors.text;
    ctx.font = "bold 26px Cobbler";
    ctx.fillText("SYSTEM INFORMATION", 40, yPos);
    ctx.restore();
    yPos += 45;
    
    const cardWidth = 360;
    const cardHeight = 90;
    const cardSpacing = 30;
    
    await drawInfoCard(
        ctx,
        40,
        yPos,
        cardWidth,
        cardHeight,
        "https://img.icons8.com/fluency/96/server--v1.png",
        "HOSTNAME",
        systemData.kernel.hostname,
        `Uptime: ${systemData.uptimeSys}`,
        colors.accent,
        colors.accentGlow
    );
    
    await drawInfoCard(
        ctx,
        40 + cardWidth + cardSpacing,
        yPos,
        cardWidth,
        cardHeight,
        "https://img.icons8.com/color/96/nodejs.png",
        "NODE.JS",
        systemData.proc.nodeVersion,
        `${systemData.proc.platform} • ${systemData.proc.arch}`,
        colors.success,
        colors.successGlow
    );
    
    await drawInfoCard(
        ctx,
        40 + (cardWidth + cardSpacing) * 2,
        yPos,
        cardWidth,
        cardHeight,
        "https://img.icons8.com/external-parzival-1997-outline-color-parzival-1997/64/external-system-artificial-intelligence-and-machine-learning-parzival-1997-outline-color-parzival-1997.png",
        "KERNEL",
        systemData.kernel.version,
        systemData.osInfo.pretty,
        colors.purple,
        colors.purpleGlow
    );
    
    yPos += cardHeight + 35;
    
    await drawInfoCard(
        ctx,
        40,
        yPos,
        cardWidth,
        cardHeight,
        "https://img.icons8.com/color/96/download-from-cloud.png",
        "NETWORK RX",
        formatSize(systemData.network.rx),
        `${systemData.network.rxPackets.toLocaleString()} packets`,
        colors.success,
        colors.successGlow
    );
    
    await drawInfoCard(
        ctx,
        40 + cardWidth + cardSpacing,
        yPos,
        cardWidth,
        cardHeight,
        "https://img.icons8.com/color/96/upload-to-cloud.png",
        "NETWORK TX",
        formatSize(systemData.network.tx),
        `${systemData.network.txPackets.toLocaleString()} packets`,
        colors.warning,
        colors.warningGlow
    );
    
    await drawInfoCard(
        ctx,
        40 + (cardWidth + cardSpacing) * 2,
        yPos,
        cardWidth,
        cardHeight,
        "https://img.icons8.com/fluency/96/process--v1.png",
        "PROCESS",
        `PID: ${systemData.proc.pid}`,
        `RSS: ${formatSize(systemData.heap.rss)}`,
        colors.orange,
        colors.orangeGlow
    );
    
    yPos += cardHeight + 40;
    
    ctx.save();
    ctx.shadowColor = colors.accentGlow;
    ctx.shadowBlur = 15;
    ctx.fillStyle = colors.text;
    ctx.font = "bold 26px Cobbler";
    ctx.fillText("SYSTEM METRICS", 40, yPos);
    ctx.restore();
    yPos += 45;
    
    const metricCardWidth = (1160 - 40 - cardSpacing) / 2;
    
    await drawInfoCard(
        ctx,
        40,
        yPos,
        metricCardWidth,
        cardHeight,
        "https://img.icons8.com/fluency/96/cpu.png",
        "CPU SINCE BOOT",
        `${systemData.cpuBootUsage}%`,
        systemData.cpu.model.substring(0, 35) + "...",
        colors.orange,
        colors.orangeGlow
    );
    
    await drawInfoCard(
        ctx,
        40 + metricCardWidth + cardSpacing,
        yPos,
        metricCardWidth,
        cardHeight,
        "https://img.icons8.com/fluency/96/clock.png",
        "BOT UPTIME",
        systemData.uptimeBot,
        `System: ${systemData.uptimeSys}`,
        colors.accent,
        colors.accentGlow
    );
    
    return canvas.toBuffer("image/png");
}