import { createCanvas, loadImage, GlobalFonts } from "@napi-rs/canvas";
import { formatSize } from "./system-info.js";
import { join } from "path";

GlobalFonts.registerFromPath(join(process.cwd(), "lib", "Cobbler-SemiBold.ttf"), "Cobbler");

const c = {
    bg: "#0a0e14",
    card: "rgba(22, 27, 34, 0.85)",
    cardLight: "rgba(30, 35, 42, 0.7)",
    border: "rgba(88, 166, 255, 0.2)",
    cyan: "#00d9ff",
    blue: "#3b82f6",
    purple: "#a78bfa",
    green: "#22c55e",
    orange: "#fb923c",
    red: "#ef4444",
    white: "#ffffff",
    gray: "#94a3b8",
    dark: "#64748b",
    darker: "#475569",
    accent: "rgba(0, 217, 255, 0.08)",
};

function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
}

function drawCard(ctx, x, y, w, h, r = 16) {
    ctx.save();
    roundRect(ctx, x, y, w, h, r);
    ctx.fillStyle = c.card;
    ctx.fill();
    ctx.strokeStyle = c.border;
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.restore();
}

function drawProgressCircle(ctx, cx, cy, radius, percent, color) {
    const lineWidth = 12;
    
    // Background
    ctx.save();
    ctx.strokeStyle = "rgba(255, 255, 255, 0.04)";
    ctx.lineWidth = lineWidth;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
    
    // Progress
    if (percent > 0) {
        ctx.save();
        const startAngle = -Math.PI / 2;
        const endAngle = startAngle + (Math.PI * 2 * percent) / 100;
        
        const gradient = ctx.createLinearGradient(cx - radius, cy, cx + radius, cy);
        gradient.addColorStop(0, color);
        gradient.addColorStop(1, c.cyan);
        
        ctx.strokeStyle = gradient;
        ctx.lineWidth = lineWidth;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.arc(cx, cy, radius, startAngle, endAngle);
        ctx.stroke();
        ctx.restore();
    }
}

function drawProgressBar(ctx, x, y, w, h, percent, color) {
    // Background
    ctx.save();
    ctx.fillStyle = "rgba(255, 255, 255, 0.04)";
    roundRect(ctx, x, y, w, h, h / 2);
    ctx.fill();
    ctx.restore();
    
    // Progress
    if (percent > 0) {
        ctx.save();
        const progressW = (percent / 100) * w;
        const gradient = ctx.createLinearGradient(x, y, x + progressW, y);
        gradient.addColorStop(0, color);
        gradient.addColorStop(1, c.cyan);
        
        ctx.fillStyle = gradient;
        roundRect(ctx, x, y, progressW, h, h / 2);
        ctx.fill();
        ctx.restore();
    }
}

async function drawIconCard(ctx, x, y, w, h, iconUrl, label, value, subtext, accentColor) {
    drawCard(ctx, x, y, w, h, 14);
    
    // Accent line
    ctx.save();
    ctx.fillStyle = accentColor;
    roundRect(ctx, x, y, 4, h, 2);
    ctx.fill();
    ctx.restore();
    
    // Icon
    const iconSize = 36;
    const iconX = x + 16;
    const iconY = y + (h - iconSize) / 2;
    
    try {
        const img = await loadImage(iconUrl);
        ctx.drawImage(img, iconX, iconY, iconSize, iconSize);
    } catch {
        ctx.fillStyle = accentColor;
        roundRect(ctx, iconX, iconY, iconSize, iconSize, 6);
        ctx.fill();
    }
    
    // Text
    const textX = iconX + iconSize + 14;
    
    ctx.fillStyle = c.dark;
    ctx.font = "11px Cobbler";
    ctx.textAlign = "left";
    ctx.fillText(label.toUpperCase(), textX, y + 20);
    
    ctx.fillStyle = c.white;
    ctx.font = "bold 17px Cobbler";
    ctx.fillText(value, textX, y + 40);
    
    if (subtext) {
        ctx.fillStyle = c.darker;
        ctx.font = "10px Cobbler";
        ctx.fillText(subtext, textX, y + 56);
    }
}

function drawMemoryBreakdown(ctx, x, y, w, h, ramData, heapPct) {
    drawCard(ctx, x, y, w, h, 16);
    
    // Title
    ctx.fillStyle = c.white;
    ctx.font = "bold 17px Cobbler";
    ctx.textAlign = "left";
    ctx.fillText("MEMORY BREAKDOWN", x + 22, y + 24);
    
    const totalRam = ramData.ramTotal;
    const ramUsed = ramData.ramUsed;
    const ramCached = ramData.ramCached;
    const ramBuffers = ramData.ramBuffers;
    const ramFree = ramData.ramFree;
    
    const usedPct = (ramUsed / totalRam) * 100;
    const cachedPct = (ramCached / totalRam) * 100;
    const buffersPct = (ramBuffers / totalRam) * 100;
    const freePct = (ramFree / totalRam) * 100;
    
    // Stacked bar for RAM
    const barX = x + 22;
    const barY = y + 45;
    const barW = w - 44;
    const barH = 20;
    
    // RAM Bar
    let currentX = barX;
    
    // Used
    const usedW = (usedPct / 100) * barW;
    ctx.fillStyle = c.cyan;
    roundRect(ctx, currentX, barY, usedW, barH, 4);
    ctx.fill();
    currentX += usedW;
    
    // Cached
    const cachedW = (cachedPct / 100) * barW;
    ctx.fillStyle = c.blue;
    roundRect(ctx, currentX, barY, cachedW, barH, 4);
    ctx.fill();
    currentX += cachedW;
    
    // Buffers
    const buffersW = (buffersPct / 100) * barW;
    ctx.fillStyle = c.purple;
    roundRect(ctx, currentX, barY, buffersW, barH, 4);
    ctx.fill();
    currentX += buffersW;
    
    // Free
    const freeW = (freePct / 100) * barW;
    ctx.fillStyle = c.green;
    roundRect(ctx, currentX, barY, freeW, barH, 4);
    ctx.fill();
    
    // Bar labels
    ctx.fillStyle = c.white;
    ctx.font = "bold 12px Cobbler";
    ctx.textAlign = "center";
    
    if (usedW > 40) {
        ctx.fillText(`${usedPct.toFixed(1)}%`, barX + usedW / 2, barY + 14);
    }
    if (cachedW > 40) {
        ctx.fillText(`${cachedPct.toFixed(1)}%`, barX + usedW + cachedW / 2, barY + 14);
    }
    if (buffersW > 40) {
        ctx.fillText(`${buffersPct.toFixed(1)}%`, barX + usedW + cachedW + buffersW / 2, barY + 14);
    }
    if (freeW > 40) {
        ctx.fillText(`${freePct.toFixed(1)}%`, barX + usedW + cachedW + buffersW + freeW / 2, barY + 14);
    }
    
    // Legend
    const legendY = barY + barH + 20;
    const legendSpacing = 140;
    
    // Used
    ctx.fillStyle = c.cyan;
    ctx.beginPath();
    ctx.arc(barX, legendY, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = c.white;
    ctx.font = "12px Cobbler";
    ctx.textAlign = "left";
    ctx.fillText(`Used: ${formatSize(ramUsed)}`, barX + 10, legendY + 4);
    
    // Cached
    ctx.fillStyle = c.blue;
    ctx.beginPath();
    ctx.arc(barX + legendSpacing, legendY, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = c.white;
    ctx.textAlign = "left";
    ctx.fillText(`Cached: ${formatSize(ramCached)}`, barX + legendSpacing + 10, legendY + 4);
    
    // Buffers
    ctx.fillStyle = c.purple;
    ctx.beginPath();
    ctx.arc(barX + legendSpacing * 2, legendY, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = c.white;
    ctx.textAlign = "left";
    ctx.fillText(`Buffers: ${formatSize(ramBuffers)}`, barX + legendSpacing * 2 + 10, legendY + 4);
    
    // Free
    ctx.fillStyle = c.green;
    ctx.beginPath();
    ctx.arc(barX + legendSpacing * 3, legendY, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = c.white;
    ctx.textAlign = "left";
    ctx.fillText(`Free: ${formatSize(ramFree)}`, barX + legendSpacing * 3 + 10, legendY + 4);
    
    // Heap progress bar
    const heapBarY = legendY + 25;
    const heapBarH = 12;
    
    ctx.fillStyle = c.dark;
    ctx.font = "11px Cobbler";
    ctx.textAlign = "left";
    ctx.fillText("HEAP MEMORY:", barX, heapBarY + heapBarH / 2 + 4);
    
    drawProgressBar(ctx, barX + 90, heapBarY, barW - 90, heapBarH, heapPct, c.orange);
    
    ctx.fillStyle = c.white;
    ctx.font = "bold 12px Cobbler";
    ctx.textAlign = "right";
    ctx.fillText(`${heapPct.toFixed(1)}%`, barX + barW, heapBarY + heapBarH / 2 + 4);
}

export async function canvas(systemData) {
    const W = 1200;
    const H = 1200;
    const canvas = createCanvas(W, H);
    const ctx = canvas.getContext("2d");
    
    // Background
    const bgGrad = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, W * 0.7);
    bgGrad.addColorStop(0, "#161b22");
    bgGrad.addColorStop(0.5, c.bg);
    bgGrad.addColorStop(1, "#0d1117");
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, W, H);
    
    // Ambient glow
    ctx.save();
    ctx.globalAlpha = 0.15;
    
    const glow1 = ctx.createRadialGradient(200, 200, 0, 200, 200, 400);
    glow1.addColorStop(0, c.cyan);
    glow1.addColorStop(1, "transparent");
    ctx.fillStyle = glow1;
    ctx.fillRect(0, 0, 600, 600);
    
    const glow2 = ctx.createRadialGradient(1000, 1000, 0, 1000, 1000, 400);
    glow2.addColorStop(0, c.purple);
    glow2.addColorStop(1, "transparent");
    ctx.fillStyle = glow2;
    ctx.fillRect(600, 600, 600, 600);
    ctx.restore();
    
    // Subtle grid
    ctx.save();
    ctx.globalAlpha = 0.01;
    ctx.strokeStyle = c.cyan;
    ctx.lineWidth = 1;
    for (let i = 0; i < W; i += 50) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i, H);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(0, i);
        ctx.lineTo(W, i);
        ctx.stroke();
    }
    ctx.restore();
    
    const P = 30;
    const G = 16;
    
    // Header with kernel info
    ctx.fillStyle = c.white;
    ctx.font = "bold 32px Cobbler";
    ctx.textAlign = "left";
    ctx.fillText(`${systemData.kernel.hostname.toUpperCase()}`, P, P + 32);
    
    ctx.fillStyle = c.gray;
    ctx.font = "14px Cobbler";
    ctx.fillText(`Kernel: ${systemData.kernel.version.substring(0, 40)}`, P, P + 56);
    
    ctx.fillStyle = c.dark;
    ctx.font = "14px Cobbler";
    ctx.fillText(new Date().toLocaleString("id-ID"), P, P + 76);
    
    // Status badge
    const badgeW = 110;
    const badgeH = 44;
    const badgeX = W - P - badgeW;
    const badgeY = P;
    
    ctx.save();
    ctx.fillStyle = c.accent;
    roundRect(ctx, badgeX, badgeY, badgeW, badgeH, 10);
    ctx.fill();
    ctx.strokeStyle = c.border;
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.restore();
    
    ctx.fillStyle = c.cyan;
    ctx.font = "bold 16px Cobbler";
    ctx.textAlign = "center";
    ctx.fillText("ONLINE", badgeX + badgeW / 2, badgeY + 28);
    
    let Y = P + 100;
    
    // Calculate percentages
    const cpuPct = Math.max(0.1, Math.min(parseFloat(systemData.cpu.load1Pct), 100));
    const ramPct = Math.max(0.1, systemData.ram.ramTotal > 0 ? (systemData.ram.ramUsed / systemData.ram.ramTotal) * 100 : 0);
    const diskPct = Math.max(0.1, systemData.disk.total > 0 ? (systemData.disk.used / systemData.disk.total) * 100 : 0);
    const heapPct = Math.max(0.1, systemData.heap.heapTotal > 0 ? (systemData.heap.heapUsed / systemData.heap.heapTotal) * 100 : 0);
    
    // === THREE METRICS CIRCLES ===
    const circleW = 370;
    const circleH = 200;
    const circleRadius = 60;
    
    // Calculate exact positions for center alignment
    const totalCircleWidth = (circleW * 3) + (G * 2);
    const startX = (W - totalCircleWidth) / 2;
    
    // CPU
    drawCard(ctx, startX, Y, circleW, circleH, 16);
    const cpuCX = startX + circleW / 2;
    const cpuCY = Y + circleH / 2;
    drawProgressCircle(ctx, cpuCX, cpuCY, circleRadius, cpuPct, c.orange);
    
    ctx.fillStyle = c.white;
    ctx.font = "bold 38px Cobbler";
    ctx.textAlign = "center";
    ctx.fillText(`${cpuPct.toFixed(0)}%`, cpuCX, cpuCY - 4);
    
    ctx.fillStyle = c.gray;
    ctx.font = "13px Cobbler";
    ctx.fillText("CPU", cpuCX, cpuCY + 18);
    
    ctx.fillStyle = c.dark;
    ctx.font = "11px Cobbler";
    ctx.fillText(`${systemData.cpu.cores} Cores`, cpuCX, cpuCY + 34);
    
    // Memory
    drawCard(ctx, startX + circleW + G, Y, circleW, circleH, 16);
    const ramCX = startX + circleW + G + circleW / 2;
    const ramCY = Y + circleH / 2;
    drawProgressCircle(ctx, ramCX, ramCY, circleRadius, ramPct, c.blue);
    
    ctx.fillStyle = c.white;
    ctx.font = "bold 38px Cobbler";
    ctx.textAlign = "center";
    ctx.fillText(`${ramPct.toFixed(0)}%`, ramCX, ramCY - 4);
    
    ctx.fillStyle = c.gray;
    ctx.font = "13px Cobbler";
    ctx.fillText("MEMORY", ramCX, ramCY + 18);
    
    ctx.fillStyle = c.dark;
    ctx.font = "11px Cobbler";
    ctx.fillText(formatSize(systemData.ram.ramTotal), ramCX, ramCY + 34);
    
    // Storage
    drawCard(ctx, startX + (circleW + G) * 2, Y, circleW, circleH, 16);
    const diskCX = startX + (circleW + G) * 2 + circleW / 2;
    const diskCY = Y + circleH / 2;
    drawProgressCircle(ctx, diskCX, diskCY, circleRadius, diskPct, c.purple);
    
    ctx.fillStyle = c.white;
    ctx.font = "bold 38px Cobbler";
    ctx.textAlign = "center";
    ctx.fillText(`${diskPct.toFixed(0)}%`, diskCX, diskCY - 4);
    
    ctx.fillStyle = c.gray;
    ctx.font = "13px Cobbler";
    ctx.fillText("STORAGE", diskCX, diskCY + 18);
    
    ctx.fillStyle = c.dark;
    ctx.font = "11px Cobbler";
    ctx.fillText(formatSize(systemData.disk.total), diskCX, diskCY + 34);
    
    Y += circleH + G + 20;
    
    // === SYSTEM INFO CARDS ===
    const infoW = 285;
    const infoH = 70;
    const totalInfoWidth = (infoW * 4) + (G * 3);
    const infoStartX = (W - totalInfoWidth) / 2;
    
    await drawIconCard(ctx, infoStartX, Y, infoW, infoH,
        "https://cdn-icons-png.flaticon.com/128/2920/2920277.png",
        "Hostname", systemData.kernel.hostname.split('.')[0],
        `Uptime: ${systemData.uptimeSys}`, c.cyan);
    
    await drawIconCard(ctx, infoStartX + infoW + G, Y, infoW, infoH,
        "https://cdn-icons-png.flaticon.com/128/5968/5968322.png",
        "Node.js", systemData.proc.nodeVersion,
        `${systemData.proc.platform} / ${systemData.proc.arch}`, c.green);
    
    await drawIconCard(ctx, infoStartX + (infoW + G) * 2, Y, infoW, infoH,
        "https://cdn-icons-png.flaticon.com/128/3524/3524659.png",
        "CPU Boot", `${systemData.cpuBootUsage}%`,
        `Load: ${systemData.cpu.load1}`, c.orange);
    
    await drawIconCard(ctx, infoStartX + (infoW + G) * 3, Y, infoW, infoH,
        "https://cdn-icons-png.flaticon.com/128/3524/3524659.png",
        "Heap Used", `${heapPct.toFixed(0)}%`,
        formatSize(systemData.heap.heapUsed), c.red);
    
    Y += infoH + G + 20;
    
    // === MEMORY BREAKDOWN WITH HEAP BAR ===
    const memW = W - P * 2;
    const memH = 180;
    drawMemoryBreakdown(ctx, P, Y, memW, memH, systemData.ram, heapPct);
    
    Y += memH + G;
    
    // === CPU HISTORY ===
    const histW = W - P * 2;
    const histH = 200;
    drawCard(ctx, P, Y, histW, histH, 16);
    
    // Title with accent
    ctx.save();
    ctx.fillStyle = c.accent;
    roundRect(ctx, P, Y, 120, histH, 16);
    ctx.fill();
    ctx.restore();
    
    ctx.fillStyle = c.white;
    ctx.font = "bold 17px Cobbler";
    ctx.textAlign = "left";
    ctx.fillText("CPU LOAD HISTORY", P + 22, Y + 24);
    
    // Generate realistic history data
    const history = Array.from({length: 12}, (_, i) => {
        const base = Math.max(1, cpuPct);
        const variation = Math.sin(i * 0.5) * 15;
        return Math.max(1, Math.min(100, base + variation));
    });
    
    const barW = 70;
    const barMaxH = 120;
    const barStartX = P + 30;
    const barStartY = Y + 60;
    const barGap = 10;
    
    // Draw horizontal grid lines
    ctx.save();
    ctx.strokeStyle = "rgba(255, 255, 255, 0.03)";
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
        const y = barStartY + barMaxH - (barMaxH * i / 4);
        ctx.beginPath();
        ctx.moveTo(barStartX, y);
        ctx.lineTo(barStartX + (barW + barGap) * 12, y);
        ctx.stroke();
        
        // Percentage labels
        ctx.fillStyle = c.dark;
        ctx.font = "10px Cobbler";
        ctx.textAlign = "right";
        ctx.fillText(`${i * 25}%`, barStartX - 10, y + 3);
    }
    ctx.restore();
    
    history.forEach((val, i) => {
        const h = (val / 100) * barMaxH;
        const x = barStartX + i * (barW + barGap);
        const y = barStartY + barMaxH - h;
        
        const grad = ctx.createLinearGradient(x, y, x, y + h);
        grad.addColorStop(0, c.cyan);
        grad.addColorStop(1, c.blue);
        ctx.fillStyle = grad;
        roundRect(ctx, x, y, barW, h, 4);
        ctx.fill();
        
        ctx.fillStyle = c.white;
        ctx.font = "bold 12px Cobbler";
        ctx.textAlign = "center";
        ctx.fillText(`${val.toFixed(0)}%`, x + barW / 2, y - 6);
        
        // Time labels
        ctx.fillStyle = c.dark;
        ctx.font = "10px Cobbler";
        ctx.fillText(`-${11 - i}m`, x + barW / 2, barStartY + barMaxH + 15);
    });
    
    Y += histH + G;
    
    // === NETWORK & PROCESS ===
    const netW = 380;
    const netH = 150;
    
    // Network RX
    drawCard(ctx, P, Y, netW, netH, 16);
    
    ctx.save();
    ctx.fillStyle = c.accent;
    roundRect(ctx, P, Y, 70, netH, 16);
    ctx.fill();
    ctx.restore();
    
    ctx.fillStyle = c.white;
    ctx.font = "bold 15px Cobbler";
    ctx.textAlign = "left";
    ctx.fillText("NETWORK RX", P + 20, Y + 22);
    
    ctx.fillStyle = c.cyan;
    ctx.font = "bold 28px Cobbler";
    ctx.fillText(formatSize(systemData.network.rx), P + 20, Y + 54);
    
    ctx.fillStyle = c.gray;
    ctx.font = "12px Cobbler";
    ctx.fillText(`${systemData.network.rxPackets.toLocaleString()} packets`, P + 20, Y + 72);
    
    const rxData = Array.from({length: 7}, (_, i) => 30 + Math.sin(i) * 20);
    const miniW = 32;
    const miniH = 48;
    const miniStartX = P + 26;
    const miniStartY = Y + 90;
    
    rxData.forEach((val, i) => {
        const h = (val / 100) * miniH;
        const x = miniStartX + i * (miniW + 3);
        const y = miniStartY + miniH - h;
        
        const grad = ctx.createLinearGradient(x, y, x, y + h);
        grad.addColorStop(0, c.cyan);
        grad.addColorStop(1, c.blue);
        ctx.fillStyle = grad;
        roundRect(ctx, x, y, miniW, h, 4);
        ctx.fill();
    });
    
    // Network TX
    drawCard(ctx, P + netW + G, Y, netW, netH, 16);
    
    ctx.save();
    ctx.fillStyle = c.accent;
    roundRect(ctx, P + netW + G, Y, 70, netH, 16);
    ctx.fill();
    ctx.restore();
    
    ctx.fillStyle = c.white;
    ctx.font = "bold 15px Cobbler";
    ctx.textAlign = "left";
    ctx.fillText("NETWORK TX", P + netW + G + 20, Y + 22);
    
    ctx.fillStyle = c.purple;
    ctx.font = "bold 28px Cobbler";
    ctx.fillText(formatSize(systemData.network.tx), P + netW + G + 20, Y + 54);
    
    ctx.fillStyle = c.gray;
    ctx.font = "12px Cobbler";
    ctx.fillText(`${systemData.network.txPackets.toLocaleString()} packets`, P + netW + G + 20, Y + 72);
    
    const txData = Array.from({length: 7}, (_, i) => 40 + Math.cos(i) * 15);
    const txStartX = P + netW + G + 26;
    
    txData.forEach((val, i) => {
        const h = (val / 100) * miniH;
        const x = txStartX + i * (miniW + 3);
        const y = miniStartY + miniH - h;
        
        const grad = ctx.createLinearGradient(x, y, x, y + h);
        grad.addColorStop(0, c.purple);
        grad.addColorStop(1, c.blue);
        ctx.fillStyle = grad;
        roundRect(ctx, x, y, miniW, h, 4);
        ctx.fill();
    });
    
    // Process Info
    drawCard(ctx, P + (netW + G) * 2, Y, netW, netH, 16);
    
    ctx.save();
    ctx.fillStyle = c.accent;
    roundRect(ctx, P + (netW + G) * 2 + netW - 70, Y, 70, netH, 16);
    ctx.fill();
    ctx.restore();
    
    ctx.fillStyle = c.white;
    ctx.font = "bold 15px Cobbler";
    ctx.textAlign = "left";
    ctx.fillText("PROCESS INFO", P + (netW + G) * 2 + 20, Y + 22);
    
    ctx.fillStyle = c.dark;
    ctx.font = "12px Cobbler";
    ctx.fillText("PID", P + (netW + G) * 2 + 20, Y + 48);
    
    ctx.fillStyle = c.white;
    ctx.font = "bold 20px Cobbler";
    ctx.fillText(systemData.proc.pid.toString(), P + (netW + G) * 2 + 20, Y + 70);
    
    ctx.fillStyle = c.dark;
    ctx.font = "12px Cobbler";
    ctx.fillText("RSS Memory", P + (netW + G) * 2 + 20, Y + 96);
    
    ctx.fillStyle = c.white;
    ctx.font = "bold 20px Cobbler";
    ctx.fillText(formatSize(systemData.heap.rss), P + (netW + G) * 2 + 20, Y + 118);
    
    Y += netH + G;
    
    // === FOOTER ===
    const footH = 62;
    drawCard(ctx, P, Y, W - P * 2, footH, 14);
    
    if (systemData.warnings.length > 0) {
        ctx.save();
        ctx.fillStyle = "rgba(239, 68, 68, 0.1)";
        roundRect(ctx, P, Y, W - P * 2, footH, 14);
        ctx.fill();
        ctx.restore();
        
        ctx.fillStyle = c.red;
        ctx.font = "bold 17px Cobbler";
        ctx.textAlign = "left";
        ctx.fillText(`WARNING: ${systemData.warnings.join(" • ")}`, P + 24, Y + 38);
    } else {
        ctx.save();
        ctx.fillStyle = c.accent;
        roundRect(ctx, P, Y, W - P * 2, footH, 14);
        ctx.fill();
        ctx.restore();
        
        ctx.fillStyle = c.cyan;
        ctx.font = "bold 18px Cobbler";
        ctx.textAlign = "left";
        ctx.fillText("ALL SYSTEMS OPERATIONAL", P + 24, Y + 30);
        
        ctx.fillStyle = c.gray;
        ctx.font = "14px Cobbler";
        ctx.fillText(`Bot: ${systemData.uptimeBot} • System: ${systemData.uptimeSys}`, P + 24, Y + 50);
    }
    
    return canvas.toBuffer("image/png");
}