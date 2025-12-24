import { createCanvas, GlobalFonts } from "@napi-rs/canvas";
import { formatSize } from "#lib/system.js";
import { join } from "path";

GlobalFonts.registerFromPath(join(process.cwd(), "src", "lib", "Cobbler-SemiBold.ttf"), "Cobbler");

const c = {
    bg: "#E8EDF3",
    cardBg: "#FFFFFF",
    cardDark: "#1F2937",
    border: "#E5E7EB",
    borderDark: "#374151",
    primary: "#111827",
    secondary: "#6B7280",
    accent: "#3B82F6",
    success: "#10B981",
    warning: "#F59E0B",
    danger: "#EF4444",
    text: "#1F2937",
    textLight: "#9CA3AF",
    white: "#FFFFFF",
    gridLine: "#E5E7EB",
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

function drawCard(ctx, x, y, w, h, r = 20, isDark = false) {
    ctx.save();

    ctx.shadowColor = "rgba(0, 0, 0, 0.15)";
    ctx.shadowBlur = 40;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 12;

    roundRect(ctx, x, y, w, h, r);
    ctx.fillStyle = isDark ? c.cardDark : c.cardBg;
    ctx.fill();

    ctx.shadowColor = "rgba(0, 0, 0, 0.08)";
    ctx.shadowBlur = 20;
    ctx.shadowOffsetY = 6;
    ctx.fill();

    ctx.shadowColor = "transparent";

    const grad = ctx.createLinearGradient(x, y, x, y + h);
    grad.addColorStop(0, isDark ? "rgba(255, 255, 255, 0.08)" : "rgba(255, 255, 255, 0.9)");
    grad.addColorStop(1, "rgba(255, 255, 255, 0)");
    ctx.strokeStyle = grad;
    ctx.lineWidth = 2;
    roundRect(ctx, x + 1, y + 1, w - 2, h - 2, r - 1);
    ctx.stroke();

    ctx.strokeStyle = isDark ? c.borderDark : c.border;
    ctx.lineWidth = 1;
    roundRect(ctx, x, y, w, h, r);
    ctx.stroke();

    ctx.restore();
}

function drawProgressCircle(ctx, cx, cy, radius, percent, color, isDark = false) {
    const lineWidth = 12;

    ctx.save();
    ctx.strokeStyle = isDark ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.06)";
    ctx.lineWidth = lineWidth;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    if (percent > 0) {
        ctx.save();
        const startAngle = -Math.PI / 2;
        const endAngle = startAngle + (Math.PI * 2 * percent) / 100;

        ctx.shadowColor = color;
        ctx.shadowBlur = 20;
        ctx.strokeStyle = color;
        ctx.lineWidth = lineWidth;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.arc(cx, cy, radius, startAngle, endAngle);
        ctx.stroke();

        ctx.shadowBlur = 10;
        ctx.stroke();

        ctx.restore();
    }
}

function drawSmoothChart(ctx, x, y, w, h, data, color, showGrid = true) {
    if (!data || data.length < 2) return;

    const maxVal = Math.max(...data);
    const minVal = Math.min(...data);
    const range = maxVal - minVal || 1;

    if (showGrid) {
        ctx.save();
        ctx.strokeStyle = c.gridLine;
        ctx.lineWidth = 1;
        ctx.setLineDash([5, 5]);

        for (let i = 0; i <= 4; i++) {
            const gridY = y + (h / 4) * i;
            ctx.beginPath();
            ctx.moveTo(x, gridY);
            ctx.lineTo(x + w, gridY);
            ctx.stroke();
        }

        ctx.setLineDash([]);
        ctx.restore();
    }

    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    ctx.shadowColor = color + "80";
    ctx.shadowBlur = 12;
    ctx.shadowOffsetY = 3;

    ctx.beginPath();

    const points = data.map((val, i) => ({
        x: x + (i / (data.length - 1)) * w,
        y: y + h - ((val - minVal) / range) * h,
    }));

    ctx.moveTo(points[0].x, points[0].y);

    for (let i = 1; i < points.length; i++) {
        const cp1x = (points[i - 1].x + points[i].x) / 2;
        const cp1y = points[i - 1].y;
        const cp2x = (points[i - 1].x + points[i].x) / 2;
        const cp2y = points[i].y;

        ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, points[i].x, points[i].y);
    }

    ctx.stroke();
    ctx.shadowColor = "transparent";

    ctx.lineTo(x + w, y + h);
    ctx.lineTo(x, y + h);
    ctx.closePath();

    const gradient = ctx.createLinearGradient(0, y, 0, y + h);
    gradient.addColorStop(0, color + "60");
    gradient.addColorStop(1, color + "08");
    ctx.fillStyle = gradient;
    ctx.fill();

    ctx.restore();

    ctx.save();
    points.forEach((point, i) => {
        if (i % 3 === 0) {
            ctx.shadowColor = color + "60";
            ctx.shadowBlur = 8;
            ctx.beginPath();
            ctx.arc(point.x, point.y, 5, 0, Math.PI * 2);
            ctx.fillStyle = c.cardBg;
            ctx.fill();
            ctx.shadowColor = "transparent";
            ctx.strokeStyle = color;
            ctx.lineWidth = 2.5;
            ctx.stroke();
        }
    });
    ctx.restore();
}

function drawIcon(ctx, x, y, size, type, color) {
    ctx.save();
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    if (type === "check") {
        ctx.beginPath();
        ctx.moveTo(x + size * 0.2, y + size * 0.5);
        ctx.lineTo(x + size * 0.4, y + size * 0.7);
        ctx.lineTo(x + size * 0.8, y + size * 0.3);
        ctx.stroke();
    } else if (type === "warning") {
        ctx.beginPath();
        ctx.moveTo(x + size * 0.5, y + size * 0.2);
        ctx.lineTo(x + size * 0.9, y + size * 0.8);
        ctx.lineTo(x + size * 0.1, y + size * 0.8);
        ctx.closePath();
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(x + size * 0.5, y + size * 0.4);
        ctx.lineTo(x + size * 0.5, y + size * 0.6);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(x + size * 0.5, y + size * 0.72, size * 0.04, 0, Math.PI * 2);
        ctx.fill();
    }

    ctx.restore();
}

export async function canvas(systemData) {
    const HD_SCALE = 2;
    const BASE_WIDTH = 1200;
    const BASE_HEIGHT = 900;
    
    const W = BASE_WIDTH * HD_SCALE;
    const H = BASE_HEIGHT * HD_SCALE;
    
    const canvas = createCanvas(W, H);
    const ctx = canvas.getContext("2d");
    
    ctx.antialias = 'default';
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.textDrawingMode = 'glyph';
    
    ctx.scale(HD_SCALE, HD_SCALE);
    
    const bgGrad = ctx.createLinearGradient(0, 0, BASE_WIDTH, BASE_HEIGHT);
    bgGrad.addColorStop(0, "#EDF2F7");
    bgGrad.addColorStop(0.5, "#E2E8F0");
    bgGrad.addColorStop(1, "#E8EDF3");
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, BASE_WIDTH, BASE_HEIGHT);

    ctx.save();
    ctx.globalAlpha = 0.03;
    for (let i = 0; i < BASE_WIDTH; i += 10) {
        for (let j = 0; j < BASE_HEIGHT; j += 10) {
            if ((i + j) % 20 === 0) {
                ctx.fillStyle = "#000000";
                ctx.fillRect(i, j, 1, 1);
            }
        }
    }
    ctx.restore();

    const P = 40;
    const G = 20;

    const headerH = 100;

    ctx.fillStyle = c.primary;
    ctx.font = "bold 48px Cobbler";
    ctx.textAlign = "left";
    ctx.fillText("Dashboard", P, P + 45);

    ctx.fillStyle = c.textLight;
    ctx.font = "18px Cobbler";
    ctx.fillText(systemData.kernel.hostname, P, P + 72);

    const now = new Date();
    const dateStr = now.toLocaleDateString("en-US", {
        weekday: "short",
        year: "numeric",
        month: "short",
        day: "numeric",
    });
    const timeStr = now.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
    });

    ctx.fillStyle = c.textLight;
    ctx.font = "16px Cobbler";
    ctx.textAlign = "right";
    ctx.fillText(dateStr, BASE_WIDTH - P, P + 2);

    ctx.fillStyle = c.secondary;
    ctx.font = "bold 22px Cobbler";
    ctx.fillText(timeStr, BASE_WIDTH - P, P + 28);

    const badgeW = 120;
    const badgeH = 40;
    const badgeX = BASE_WIDTH - P - badgeW;
    const badgeY = P + 35;

    ctx.save();
    ctx.shadowColor = c.success + "40";
    ctx.shadowBlur = 15;
    ctx.shadowOffsetY = 6;
    ctx.fillStyle = c.success + "25";
    roundRect(ctx, badgeX, badgeY, badgeW, badgeH, 20);
    ctx.fill();
    ctx.shadowColor = "transparent";
    ctx.strokeStyle = c.success + "50";
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.restore();

    drawIcon(ctx, badgeX + 15, badgeY + 10, 18, "check", c.success);

    ctx.fillStyle = c.success;
    ctx.font = "bold 15px Cobbler";
    ctx.textAlign = "left";
    ctx.fillText("ONLINE", badgeX + 40, badgeY + 26);

    let Y = P + headerH;

    const mainCardW = (BASE_WIDTH - P * 2 - G * 2) / 3;
    const mainCardH = 220;

    const cpuPct = Math.max(0, Math.min(parseFloat(systemData.cpu.load1Pct), 100));
    const ramPct = Math.max(
        0,
        systemData.ram.ramTotal > 0 ? (systemData.ram.ramUsed / systemData.ram.ramTotal) * 100 : 0
    );
    const diskPct = Math.max(
        0,
        systemData.disk.total > 0 ? (systemData.disk.used / systemData.disk.total) * 100 : 0
    );

    drawCard(ctx, P, Y, mainCardW, mainCardH);

    ctx.fillStyle = c.textLight;
    ctx.font = "14px Cobbler";
    ctx.textAlign = "left";
    ctx.fillText("CPU USAGE", P + 28, Y + 36);

    const cpuCX = P + 100;
    const cpuCY = Y + 130;
    drawProgressCircle(ctx, cpuCX, cpuCY, 55, cpuPct, c.accent);

    ctx.fillStyle = c.primary;
    ctx.font = "bold 44px Cobbler";
    ctx.textAlign = "center";
    ctx.fillText(`${cpuPct.toFixed(0)}%`, cpuCX, cpuCY + 14);

    const cpuInfoX = P + 200;
    ctx.fillStyle = c.secondary;
    ctx.font = "14px Cobbler";
    ctx.textAlign = "left";
    ctx.fillText("Cores:", cpuInfoX, Y + 100);
    ctx.fillStyle = c.primary;
    ctx.font = "bold 20px Cobbler";
    ctx.fillText(`${systemData.cpu.cores}`, cpuInfoX, Y + 125);

    ctx.fillStyle = c.secondary;
    ctx.font = "14px Cobbler";
    ctx.fillText("Load:", cpuInfoX, Y + 150);
    ctx.fillStyle = c.primary;
    ctx.font = "bold 20px Cobbler";
    ctx.fillText(`${systemData.cpu.load1}`, cpuInfoX, Y + 175);

    drawCard(ctx, P + mainCardW + G, Y, mainCardW, mainCardH);

    ctx.fillStyle = c.textLight;
    ctx.font = "14px Cobbler";
    ctx.textAlign = "left";
    ctx.fillText("MEMORY", P + mainCardW + G + 28, Y + 36);

    const ramCX = P + mainCardW + G + 100;
    const ramCY = Y + 130;
    drawProgressCircle(ctx, ramCX, ramCY, 55, ramPct, c.warning);

    ctx.fillStyle = c.primary;
    ctx.font = "bold 44px Cobbler";
    ctx.textAlign = "center";
    ctx.fillText(`${ramPct.toFixed(0)}%`, ramCX, ramCY + 14);

    const ramInfoX = P + mainCardW + G + 200;
    ctx.fillStyle = c.secondary;
    ctx.font = "14px Cobbler";
    ctx.textAlign = "left";
    ctx.fillText("Used:", ramInfoX, Y + 100);
    ctx.fillStyle = c.primary;
    ctx.font = "bold 18px Cobbler";
    ctx.fillText(formatSize(systemData.ram.ramUsed), ramInfoX, Y + 125);

    ctx.fillStyle = c.secondary;
    ctx.font = "14px Cobbler";
    ctx.fillText("Total:", ramInfoX, Y + 150);
    ctx.fillStyle = c.primary;
    ctx.font = "bold 18px Cobbler";
    ctx.fillText(formatSize(systemData.ram.ramTotal), ramInfoX, Y + 175);

    drawCard(ctx, P + (mainCardW + G) * 2, Y, mainCardW, mainCardH);

    ctx.fillStyle = c.textLight;
    ctx.font = "14px Cobbler";
    ctx.textAlign = "left";
    ctx.fillText("STORAGE", P + (mainCardW + G) * 2 + 28, Y + 36);

    const diskCX = P + (mainCardW + G) * 2 + 100;
    const diskCY = Y + 130;
    drawProgressCircle(ctx, diskCX, diskCY, 55, diskPct, c.danger);

    ctx.fillStyle = c.primary;
    ctx.font = "bold 44px Cobbler";
    ctx.textAlign = "center";
    ctx.fillText(`${diskPct.toFixed(0)}%`, diskCX, diskCY + 14);

    const diskInfoX = P + (mainCardW + G) * 2 + 200;
    ctx.fillStyle = c.secondary;
    ctx.font = "14px Cobbler";
    ctx.textAlign = "left";
    ctx.fillText("Used:", diskInfoX, Y + 100);
    ctx.fillStyle = c.primary;
    ctx.font = "bold 18px Cobbler";
    ctx.fillText(formatSize(systemData.disk.used), diskInfoX, Y + 125);

    ctx.fillStyle = c.secondary;
    ctx.font = "14px Cobbler";
    ctx.fillText("Total:", diskInfoX, Y + 150);
    ctx.fillStyle = c.primary;
    ctx.font = "bold 18px Cobbler";
    ctx.fillText(formatSize(systemData.disk.total), diskInfoX, Y + 175);

    Y += mainCardH + G;

    const infoCardW = (BASE_WIDTH - P * 2 - G) / 2;
    const infoCardH = 150;

    drawCard(ctx, P, Y, infoCardW, infoCardH);

    ctx.fillStyle = c.textLight;
    ctx.font = "14px Cobbler";
    ctx.textAlign = "left";
    ctx.fillText("SYSTEM INFO", P + 28, Y + 36);

    const infoY = Y + 65;
    const infoLineH = 30;

    ctx.fillStyle = c.secondary;
    ctx.font = "14px Cobbler";
    ctx.fillText("Hostname:", P + 28, infoY);
    ctx.fillStyle = c.primary;
    ctx.font = "bold 18px Cobbler";
    ctx.textAlign = "right";
    ctx.fillText(systemData.kernel.hostname.split(".")[0], P + infoCardW - 28, infoY);

    ctx.fillStyle = c.secondary;
    ctx.font = "14px Cobbler";
    ctx.textAlign = "left";
    ctx.fillText("System Uptime:", P + 28, infoY + infoLineH);
    ctx.fillStyle = c.primary;
    ctx.font = "bold 18px Cobbler";
    ctx.textAlign = "right";
    ctx.fillText(systemData.uptimeSys, P + infoCardW - 28, infoY + infoLineH);

    ctx.fillStyle = c.secondary;
    ctx.font = "14px Cobbler";
    ctx.textAlign = "left";
    ctx.fillText("Node.js:", P + 28, infoY + infoLineH * 2);
    ctx.fillStyle = c.primary;
    ctx.font = "bold 18px Cobbler";
    ctx.textAlign = "right";
    ctx.fillText(systemData.proc.nodeVersion, P + infoCardW - 28, infoY + infoLineH * 2);

    drawCard(ctx, P + infoCardW + G, Y, infoCardW, infoCardH);

    ctx.fillStyle = c.textLight;
    ctx.font = "14px Cobbler";
    ctx.textAlign = "left";
    ctx.fillText("NETWORK TRAFFIC", P + infoCardW + G + 28, Y + 36);

    const netY = Y + 65;

    ctx.fillStyle = c.secondary;
    ctx.font = "14px Cobbler";
    ctx.fillText("Download:", P + infoCardW + G + 28, netY);
    ctx.fillStyle = c.accent;
    ctx.font = "bold 18px Cobbler";
    ctx.textAlign = "right";
    ctx.fillText(formatSize(systemData.network.rx), P + infoCardW * 2 + G - 28, netY);

    ctx.fillStyle = c.secondary;
    ctx.font = "14px Cobbler";
    ctx.textAlign = "left";
    ctx.fillText("Upload:", P + infoCardW + G + 28, netY + infoLineH);
    ctx.fillStyle = c.warning;
    ctx.font = "bold 18px Cobbler";
    ctx.textAlign = "right";
    ctx.fillText(formatSize(systemData.network.tx), P + infoCardW * 2 + G - 28, netY + infoLineH);

    ctx.fillStyle = c.secondary;
    ctx.font = "14px Cobbler";
    ctx.textAlign = "left";
    ctx.fillText("Total Packets:", P + infoCardW + G + 28, netY + infoLineH * 2);
    ctx.fillStyle = c.primary;
    ctx.font = "bold 18px Cobbler";
    ctx.textAlign = "right";
    ctx.fillText(
        `${(systemData.network.rxPackets + systemData.network.txPackets).toLocaleString()}`,
        P + infoCardW * 2 + G - 28,
        netY + infoLineH * 2
    );

    Y += infoCardH + G;

    const chartW = infoCardW;
    const chartH = 280;

    drawCard(ctx, P, Y, chartW, chartH);

    ctx.fillStyle = c.textLight;
    ctx.font = "14px Cobbler";
    ctx.textAlign = "left";
    ctx.fillText("CPU LOAD HISTORY", P + 28, Y + 36);

    ctx.fillStyle = c.primary;
    ctx.font = "bold 40px Cobbler";
    ctx.fillText(`${cpuPct.toFixed(2)}%`, P + 28, Y + 75);

    ctx.fillStyle = c.textLight;
    ctx.font = "14px Cobbler";
    ctx.fillText("Current Load Average", P + 28, Y + 95);

    const cpuLoad15 = parseFloat(systemData.cpu.load15) || 0;
    const cpuLoad5 = parseFloat(systemData.cpu.load5) || 0;
    const cpuLoad1 = parseFloat(systemData.cpu.load1) || 0;
    const cpuCores = systemData.cpu.cores || 1;

    const cpuLoad15Pct = Math.min(100, (cpuLoad15 / cpuCores) * 100);
    const cpuLoad5Pct = Math.min(100, (cpuLoad5 / cpuCores) * 100);
    const cpuLoad1Pct = Math.min(100, (cpuLoad1 / cpuCores) * 100);

    const chartData = Array.from({ length: 30 }, (_, i) => {
        const t = i / 29;

        let value;
        if (t <= 0.33) {
            const localT = t / 0.33;
            value = cpuLoad15Pct + (cpuLoad5Pct - cpuLoad15Pct) * localT;
        } else if (t <= 0.66) {
            const localT = (t - 0.33) / 0.33;
            value = cpuLoad5Pct + (cpuLoad1Pct - cpuLoad5Pct) * localT;
        } else {
            const localT = (t - 0.66) / 0.34;
            const variation = Math.sin(localT * Math.PI * 3) * 2 + (Math.random() - 0.5) * 1.5;
            value = cpuLoad1Pct + variation;
        }

        return Math.max(0, Math.min(100, value));
    });

    const chartAreaY = Y + 115;
    const chartAreaH = 125;
    drawSmoothChart(ctx, P + 28, chartAreaY, chartW - 56, chartAreaH, chartData, c.accent, true);

    ctx.fillStyle = c.textLight;
    ctx.font = "13px Cobbler";
    ctx.textAlign = "left";
    ctx.fillText("15m ago", P + 28, chartAreaY + chartAreaH + 22);
    ctx.textAlign = "right";
    ctx.fillText("Now", P + chartW - 28, chartAreaY + chartAreaH + 22);

    drawCard(ctx, P + chartW + G, Y, chartW, chartH, 20, true);

    ctx.fillStyle = c.white;
    ctx.font = "14px Cobbler";
    ctx.textAlign = "left";
    ctx.fillText("SYSTEM HEALTH", P + chartW + G + 28, Y + 36);

    const healthPct = Math.round(100 - ((cpuPct + ramPct + diskPct) / 300) * 100);

    const healthCX = P + chartW + G + chartW / 2;
    const healthCY = Y + chartH / 2 + 5;
    drawProgressCircle(ctx, healthCX, healthCY, 75, healthPct, c.success, true);

    ctx.fillStyle = c.white;
    ctx.font = "bold 56px Cobbler";
    ctx.textAlign = "center";
    ctx.fillText(`${healthPct}%`, healthCX, healthCY + 18);

    ctx.fillStyle = "rgba(255, 255, 255, 0.7)";
    ctx.font = "14px Cobbler";
    ctx.fillText("Overall Health", healthCX, healthCY + 44);

    const heapPct =
        systemData.heap.heapTotal > 0
            ? (systemData.heap.heapUsed / systemData.heap.heapTotal) * 100
            : 0;
    const startY = Y + chartH - 160;
    const lineHeight = 40;
    const labelOffset = 22;

    const items = [
        { label: "Uptime Bot:", value: systemData.uptimeBot },
        {
            label: "Heap Memory:",
            value: `${heapPct.toFixed(1)}% (${formatSize(systemData.heap.heapUsed)})`,
        },
        { label: "RSS Memory:", value: formatSize(systemData.heap.rss) },
    ];

    items.forEach((item, index) => {
        const y = startY + lineHeight * index;

        ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
        ctx.font = "13px Cobbler";
        ctx.textAlign = "left";
        ctx.fillText(item.label, P + chartW + G + 28, y);

        ctx.fillStyle = "rgba(255, 255, 255, 0.95)";
        ctx.font = "bold 18px Cobbler";
        ctx.fillText(item.value, P + chartW + G + 28, y + labelOffset);
    });

    const hasWarning = systemData.warnings.length > 0;
    const iconX = healthCX - 100;
    const iconY = Y + chartH - 20;

    if (hasWarning) {
        drawIcon(ctx, iconX, iconY - 8, 16, "warning", c.warning);
        ctx.fillStyle = "rgba(245, 158, 11, 0.9)";
        ctx.font = "14px Cobbler";
        ctx.textAlign = "left";
        ctx.fillText(systemData.warnings[0], iconX + 22, iconY + 5);
    } else {
        drawIcon(ctx, iconX, iconY - 8, 16, "check", c.success);
        ctx.fillStyle = "rgba(16, 185, 129, 0.9)";
        ctx.font = "14px Cobbler";
        ctx.textAlign = "left";
        ctx.fillText("All systems operational", iconX + 22, iconY + 5);
    }

    return canvas.toBuffer("image/png", {
        compressionLevel: 0,
        filters: canvas.PNG_ALL_FILTERS
    });
}