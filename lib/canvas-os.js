import { createCanvas, loadImage, GlobalFonts } from "@napi-rs/canvas";
import { formatSize } from "./system-info.js";
import { join } from "path";

GlobalFonts.registerFromPath(join(process.cwd(), "lib", "Cobbler-SemiBold.ttf"), "Cobbler");

const colors = {
    bg: "#0a0e17",
    cardBg: "#161b22",
    cardBgLight: "#1c2128",
    border: "#30363d",
    borderLight: "#484f58",
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

function drawGlow(ctx, x, y, width, height, radius, color, intensity = 20) {
    ctx.save();
    ctx.shadowColor = color;
    ctx.shadowBlur = intensity;
    ctx.fillStyle = "transparent";
    drawRoundedRect(ctx, x, y, width, height, radius);
    ctx.fill();
    ctx.restore();
}

function drawCircularProgress(ctx, x, y, radius, percentage, color, glowColor, label, value) {
    const startAngle = -Math.PI / 2;
    const endAngle = startAngle + (Math.PI * 2 * percentage) / 100;

    ctx.save();
    ctx.shadowColor = glowColor;
    ctx.shadowBlur = 35;
    ctx.strokeStyle = "transparent";
    ctx.lineWidth = 20;
    ctx.beginPath();
    ctx.arc(x, y, radius + 15, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    const bgGradient = ctx.createRadialGradient(x, y, radius - 30, x, y, radius + 10);
    bgGradient.addColorStop(0, colors.bg);
    bgGradient.addColorStop(0.5, colors.cardBg);
    bgGradient.addColorStop(1, colors.cardBgLight);
    ctx.fillStyle = bgGradient;
    ctx.beginPath();
    ctx.arc(x, y, radius + 5, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = colors.border;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x, y, radius + 5, 0, Math.PI * 2);
    ctx.stroke();

    const innerGradient = ctx.createRadialGradient(x, y, 0, x, y, radius - 12);
    innerGradient.addColorStop(0, colors.bg);
    innerGradient.addColorStop(1, colors.cardBg);
    ctx.fillStyle = innerGradient;
    ctx.beginPath();
    ctx.arc(x, y, radius - 12, 0, Math.PI * 2);
    ctx.fill();

    if (percentage > 0) {
        const progressGradient = ctx.createConicGradient(startAngle, x, y);
        progressGradient.addColorStop(0, color);
        progressGradient.addColorStop(percentage / 200, color + "ee");
        progressGradient.addColorStop(percentage / 100, color);

        ctx.strokeStyle = progressGradient;
        ctx.lineWidth = 16;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.arc(x, y, radius, startAngle, endAngle);
        ctx.stroke();

        ctx.save();
        ctx.shadowColor = glowColor;
        ctx.shadowBlur = 30;
        ctx.strokeStyle = color;
        ctx.lineWidth = 16;
        ctx.beginPath();
        ctx.arc(x, y, radius, startAngle, endAngle);
        ctx.stroke();
        ctx.restore();
    }

    ctx.save();
    ctx.shadowColor = glowColor;
    ctx.shadowBlur = 15;
    ctx.fillStyle = colors.text;
    ctx.font = "bold 42px Cobbler";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(`${percentage.toFixed(0)}%`, x, y - 22);
    ctx.restore();

    ctx.font = "bold 16px Cobbler";
    ctx.fillStyle = colors.textMuted;
    ctx.fillText(label, x, y + 8);

    ctx.font = "14px Cobbler";
    ctx.fillStyle = colors.textMuted;
    ctx.fillText(value, x, y + 30);
}

async function drawIconCard(
    ctx,
    x,
    y,
    width,
    height,
    iconUrl,
    label,
    value,
    subtext,
    accentColor,
    glowColor
) {
    drawGlow(ctx, x, y, width, height, 18, glowColor, 30);
    drawGlow(ctx, x + 2, y + 2, width - 4, height - 4, 16, glowColor, 20);

    const gradient = ctx.createLinearGradient(x, y, x + width / 2, y + height);
    gradient.addColorStop(0, colors.cardBgLight);
    gradient.addColorStop(0.5, colors.cardBg);
    gradient.addColorStop(1, colors.cardBgLight);
    ctx.fillStyle = gradient;
    drawRoundedRect(ctx, x, y, width, height, 18);
    ctx.fill();

    ctx.strokeStyle = colors.borderLight;
    ctx.lineWidth = 1;
    drawRoundedRect(ctx, x, y, width, height, 18);
    ctx.stroke();

    ctx.save();
    ctx.shadowColor = glowColor;
    ctx.shadowBlur = 15;
    ctx.strokeStyle = accentColor;
    ctx.lineWidth = 5;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(x + 20, y);
    ctx.lineTo(x + width - 20, y);
    ctx.stroke();
    ctx.restore();

    const iconSize = 46;
    const iconX = x + 24;
    const iconY = y + height / 2;

    try {
        const icon = await loadImage(iconUrl);
        ctx.save();
        ctx.shadowColor = glowColor;
        ctx.shadowBlur = 25;
        ctx.drawImage(icon, iconX, iconY - iconSize / 2, iconSize, iconSize);
        ctx.restore();
    } catch {
        ctx.save();
        ctx.shadowColor = glowColor;
        ctx.shadowBlur = 20;
        ctx.fillStyle = accentColor;
        ctx.font = "bold 32px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("●", iconX + iconSize / 2, iconY);
        ctx.restore();
    }

    ctx.fillStyle = colors.textMuted;
    ctx.font = "bold 14px Cobbler";
    ctx.textAlign = "left";
    ctx.fillText(label, x + 85, y + 30);

    ctx.save();
    ctx.shadowColor = glowColor;
    ctx.shadowBlur = 12;
    ctx.fillStyle = colors.text;
    ctx.font = "bold 22px Cobbler";
    ctx.fillText(value, x + 85, y + 56);
    ctx.restore();

    if (subtext) {
        ctx.fillStyle = colors.textMuted;
        ctx.font = "13px Cobbler";
        ctx.fillText(subtext, x + 85, y + 76);
    }

    ctx.save();
    ctx.globalAlpha = 0.3;
    ctx.strokeStyle = accentColor;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x + width - 15, y + 15, 8, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
}

function drawWaveChart(ctx, x, y, width, height, data, color, glowColor, label, currentValue) {
    drawGlow(ctx, x, y, width, height, 18, glowColor, 30);
    drawGlow(ctx, x + 2, y + 2, width - 4, height - 4, 16, glowColor, 20);

    const gradient = ctx.createLinearGradient(x, y, x, y + height);
    gradient.addColorStop(0, colors.cardBgLight);
    gradient.addColorStop(0.5, colors.cardBg);
    gradient.addColorStop(1, colors.cardBgLight);
    ctx.fillStyle = gradient;
    drawRoundedRect(ctx, x, y, width, height, 18);
    ctx.fill();

    ctx.strokeStyle = colors.borderLight;
    ctx.lineWidth = 1;
    drawRoundedRect(ctx, x, y, width, height, 18);
    ctx.stroke();

    ctx.save();
    ctx.shadowColor = glowColor;
    ctx.shadowBlur = 15;
    ctx.strokeStyle = color;
    ctx.lineWidth = 5;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(x + 20, y);
    ctx.lineTo(x + width - 20, y);
    ctx.stroke();
    ctx.restore();

    ctx.fillStyle = colors.textMuted;
    ctx.font = "bold 15px Cobbler";
    ctx.textAlign = "left";
    ctx.fillText(label, x + 24, y + 34);

    ctx.save();
    ctx.shadowColor = glowColor;
    ctx.shadowBlur = 12;
    ctx.fillStyle = colors.text;
    ctx.font = "bold 28px Cobbler";
    ctx.textAlign = "right";
    ctx.fillText(`${currentValue.toFixed(1)}%`, x + width - 35, y + 36);
    ctx.restore();

    const chartX = x + 24;
    const chartY = y + 55;
    const chartWidth = width - 48;
    const chartHeight = height - 80;

    if (data.length > 0) {
        const maxValue = Math.max(...data.map((d) => d.value), 100);
        const minValue = 0;
        const range = maxValue - minValue || 1;

        ctx.save();
        ctx.beginPath();
        ctx.rect(chartX, chartY, chartWidth, chartHeight);
        ctx.clip();

        const areaGradient = ctx.createLinearGradient(chartX, chartY, chartX, chartY + chartHeight);
        areaGradient.addColorStop(0, color + "88");
        areaGradient.addColorStop(0.5, color + "44");
        areaGradient.addColorStop(1, color + "11");

        ctx.beginPath();
        ctx.moveTo(chartX, chartY + chartHeight);

        data.forEach((point, i) => {
            const xPos = chartX + (i / Math.max(data.length - 1, 1)) * chartWidth;
            const yPos = chartY + chartHeight - ((point.value - minValue) / range) * chartHeight;

            if (i === 0) {
                ctx.lineTo(xPos, yPos);
            } else {
                const prevPoint = data[i - 1];
                const prevX = chartX + ((i - 1) / Math.max(data.length - 1, 1)) * chartWidth;
                const prevY =
                    chartY + chartHeight - ((prevPoint.value - minValue) / range) * chartHeight;

                const cpX = (prevX + xPos) / 2;
                ctx.quadraticCurveTo(cpX, prevY, xPos, yPos);
            }
        });

        ctx.lineTo(chartX + chartWidth, chartY + chartHeight);
        ctx.closePath();
        ctx.fillStyle = areaGradient;
        ctx.fill();

        ctx.save();
        ctx.shadowColor = glowColor;
        ctx.shadowBlur = 20;
        ctx.strokeStyle = color;
        ctx.lineWidth = 4;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.beginPath();

        data.forEach((point, i) => {
            const xPos = chartX + (i / Math.max(data.length - 1, 1)) * chartWidth;
            const yPos = chartY + chartHeight - ((point.value - minValue) / range) * chartHeight;

            if (i === 0) {
                ctx.moveTo(xPos, yPos);
            } else {
                const prevPoint = data[i - 1];
                const prevX = chartX + ((i - 1) / Math.max(data.length - 1, 1)) * chartWidth;
                const prevY =
                    chartY + chartHeight - ((prevPoint.value - minValue) / range) * chartHeight;

                const cpX = (prevX + xPos) / 2;
                ctx.quadraticCurveTo(cpX, prevY, xPos, yPos);
            }
        });

        ctx.stroke();
        ctx.restore();

        data.forEach((point, i) => {
            const xPos = chartX + (i / Math.max(data.length - 1, 1)) * chartWidth;
            const yPos = chartY + chartHeight - ((point.value - minValue) / range) * chartHeight;

            ctx.save();
            ctx.shadowColor = glowColor;
            ctx.shadowBlur = 12;
            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.arc(xPos, yPos, 4, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();

            ctx.strokeStyle = color + "88";
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(xPos, yPos, 6, 0, Math.PI * 2);
            ctx.stroke();
        });

        ctx.restore();
    } else {
        ctx.fillStyle = colors.textMuted;
        ctx.font = "14px Cobbler";
        ctx.textAlign = "center";
        ctx.fillText("Collecting data...", chartX + chartWidth / 2, chartY + chartHeight / 2);
    }

    ctx.save();
    ctx.globalAlpha = 0.3;
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x + width - 18, y + 18, 8, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
}

function calculateResponsiveLayout(baseWidth, baseHeight, targetWidth, targetHeight) {
    const scaleX = targetWidth / baseWidth;
    const scaleY = targetHeight / baseHeight;
    const scale = Math.min(scaleX, scaleY);

    return {
        scale,
        width: targetWidth,
        height: targetHeight,
        offsetX: (targetWidth - baseWidth * scale) / 2,
        offsetY: (targetHeight - baseHeight * scale) / 2,
    };
}

export async function canvas(systemData, options = {}) {
    const baseWidth = 1200;
    const baseHeight = 1300;

    const targetWidth = options.width || baseWidth;
    const targetHeight = options.height || baseHeight;

    const layout = calculateResponsiveLayout(baseWidth, baseHeight, targetWidth, targetHeight);
    const canvas = createCanvas(targetWidth, targetHeight);
    const ctx = canvas.getContext("2d");

    ctx.save();
    ctx.translate(layout.offsetX, layout.offsetY);
    ctx.scale(layout.scale, layout.scale);

    const bgGradient = ctx.createRadialGradient(600, 600, 0, 600, 600, 950);
    bgGradient.addColorStop(0, "#12161f");
    bgGradient.addColorStop(0.5, colors.bg);
    bgGradient.addColorStop(1, "#080a0f");
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, baseWidth, baseHeight);

    ctx.save();
    ctx.globalAlpha = 0.05;
    for (let i = 0; i < 30; i++) {
        ctx.strokeStyle = colors.accent;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(600, 600, 40 + i * 30, 0, Math.PI * 2);
        ctx.stroke();
    }
    ctx.restore();

    ctx.save();
    ctx.globalAlpha = 0.03;
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

    const corner3 = ctx.createRadialGradient(1050, 150, 0, 1050, 150, 350);
    corner3.addColorStop(0, colors.orange);
    corner3.addColorStop(1, "transparent");
    ctx.fillStyle = corner3;
    ctx.fillRect(700, 0, 500, 500);
    ctx.restore();

    ctx.save();
    ctx.globalAlpha = 0.015;
    ctx.strokeStyle = colors.accent;
    ctx.lineWidth = 1;
    for (let i = 0; i < 1200; i += 40) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i, 1200);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(0, i);
        ctx.lineTo(1200, i);
        ctx.stroke();
    }
    ctx.restore();

    ctx.save();
    ctx.shadowColor = colors.accentGlow;
    ctx.shadowBlur = 30;
    ctx.fillStyle = colors.text;
    ctx.font = "bold 46px Cobbler";
    ctx.fillText("SYSTEM MONITOR", 40, 62);
    ctx.restore();

    ctx.fillStyle = colors.textMuted;
    ctx.font = "16px Cobbler";
    ctx.fillText("Real-time Performance Dashboard", 40, 90);

    ctx.textAlign = "right";
    ctx.fillStyle = colors.textMuted;
    ctx.font = "14px Cobbler";
    ctx.fillText(new Date().toLocaleString("id-ID"), 1160, 72);
    ctx.textAlign = "left";

    const dividerGradient = ctx.createLinearGradient(40, 112, 1160, 112);
    dividerGradient.addColorStop(0, "transparent");
    dividerGradient.addColorStop(0.5, colors.accent);
    dividerGradient.addColorStop(1, "transparent");
    ctx.save();
    ctx.shadowColor = colors.accentGlow;
    ctx.shadowBlur = 20;
    ctx.strokeStyle = dividerGradient;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(40, 112);
    ctx.lineTo(1160, 112);
    ctx.stroke();
    ctx.restore();

    let yPos = 155;

    const cpuPct = parseFloat(systemData.cpu.load1Pct);
    const ramPct =
        systemData.ram.ramTotal > 0 ? (systemData.ram.ramUsed / systemData.ram.ramTotal) * 100 : 0;
    const diskPct =
        systemData.disk.total > 0 ? (systemData.disk.used / systemData.disk.total) * 100 : 0;

    drawCircularProgress(
        ctx,
        220,
        yPos + 90,
        80,
        Math.min(cpuPct, 100),
        colors.orange,
        colors.orangeGlow,
        "CPU",
        `${systemData.cpu.cores} Cores`
    );

    drawCircularProgress(
        ctx,
        600,
        yPos + 90,
        80,
        ramPct,
        colors.accent,
        colors.accentGlow,
        "MEMORY",
        formatSize(systemData.ram.ramTotal)
    );

    drawCircularProgress(
        ctx,
        980,
        yPos + 90,
        80,
        diskPct,
        colors.purple,
        colors.purpleGlow,
        "STORAGE",
        formatSize(systemData.disk.total)
    );

    yPos += 240;

    const cardWidth = 373;
    const cardHeight = 100;

    await drawIconCard(
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

    await drawIconCard(
        ctx,
        420 + 13,
        yPos,
        cardWidth,
        cardHeight,
        "https://bun.sh/logo.svg",
        "BUN RUNTIME",
        `v${Bun.version}`,
        `${systemData.proc.platform} • ${systemData.proc.arch}`,
        colors.orange,
        colors.orangeGlow
    );

    await drawIconCard(
        ctx,
        800 + 27,
        yPos,
        cardWidth,
        cardHeight,
        "https://img.icons8.com/external-parzival-1997-outline-color-parzival-1997/64/external-system-artificial-intelligence-and-machine-learning-parzival-1997-outline-color-parzival-1997.png",
        "KERNEL",
        systemData.kernel.version,
        systemData.osInfo.pretty,
        colors.success,
        colors.successGlow
    );

    yPos += cardHeight + 45;

    ctx.save();
    ctx.shadowColor = colors.accentGlow;
    ctx.shadowBlur = 20;
    ctx.fillStyle = colors.text;
    ctx.font = "bold 28px Cobbler";
    ctx.fillText("SYSTEM PERFORMANCE", 40, yPos);
    ctx.restore();
    yPos += 50;

    const chartWidth = 560;
    const chartHeight = 145;
    const chartSpacing = 40;

    const history = systemData.history || { cpu: [], memory: [], disk: [], heap: [] };

    drawWaveChart(
        ctx,
        40,
        yPos,
        chartWidth,
        chartHeight,
        history.cpu,
        colors.orange,
        colors.orangeGlow,
        "CPU LOAD",
        cpuPct
    );

    drawWaveChart(
        ctx,
        40 + chartWidth + chartSpacing,
        yPos,
        chartWidth,
        chartHeight,
        history.memory,
        colors.accent,
        colors.accentGlow,
        "MEMORY USAGE",
        ramPct
    );

    yPos += chartHeight + 32;

    drawWaveChart(
        ctx,
        40,
        yPos,
        chartWidth,
        chartHeight,
        history.disk,
        colors.purple,
        colors.purpleGlow,
        "DISK USAGE",
        diskPct
    );

    const heapPct =
        systemData.heap.heapTotal > 0
            ? (systemData.heap.heapUsed / systemData.heap.heapTotal) * 100
            : 0;

    drawWaveChart(
        ctx,
        40 + chartWidth + chartSpacing,
        yPos,
        chartWidth,
        chartHeight,
        history.heap,
        colors.warning,
        colors.warningGlow,
        "HEAP MEMORY",
        heapPct
    );

    yPos += chartHeight + 50;

    ctx.save();
    ctx.shadowColor = colors.successGlow;
    ctx.shadowBlur = 20;
    ctx.fillStyle = colors.text;
    ctx.font = "bold 28px Cobbler";
    ctx.fillText("NETWORK & SERVICES", 40, yPos);
    ctx.restore();
    yPos += 45;

    await drawIconCard(
        ctx,
        40,
        yPos,
        360,
        100,
        "https://img.icons8.com/color/96/download-from-cloud.png",
        "NETWORK RX",
        formatSize(systemData.network.rx),
        `${systemData.network.rxPackets.toLocaleString()} packets`,
        colors.success,
        colors.successGlow
    );

    await drawIconCard(
        ctx,
        420,
        yPos,
        360,
        100,
        "https://img.icons8.com/color/96/upload-to-cloud.png",
        "NETWORK TX",
        formatSize(systemData.network.tx),
        `${systemData.network.txPackets.toLocaleString()} packets`,
        colors.warning,
        colors.warningGlow
    );

    await drawIconCard(
        ctx,
        800,
        yPos,
        360,
        100,
        "https://img.icons8.com/fluency/96/process--v1.png",
        "PROCESS",
        `PID: ${systemData.proc.pid}`,
        `RSS: ${formatSize(systemData.heap.rss)}`,
        colors.purple,
        colors.purpleGlow
    );

    yPos += 130;

    const pgColor = systemData.postgres.status === "Running" ? colors.success : colors.danger;
    const pgGlow =
        systemData.postgres.status === "Running" ? colors.successGlow : colors.dangerGlow;

    await drawIconCard(
        ctx,
        40,
        yPos,
        560,
        100,
        "https://www.postgresql.org/media/img/about/press/elephant.png",
        "PostgreSQL",
        `v${systemData.postgres.version}`,
        `Status: ${systemData.postgres.status} • Connections: ${systemData.postgres.connections}`,
        pgColor,
        pgGlow
    );

    const redisColor = systemData.redis.status === "Running" ? colors.success : colors.danger;
    const redisGlow =
        systemData.redis.status === "Running" ? colors.successGlow : colors.dangerGlow;

    await drawIconCard(
        ctx,
        620,
        yPos,
        540,
        100,
        "https://img.icons8.com/color/96/redis--v1.png",
        "Redis",
        `v${systemData.redis.version}`,
        `Status: ${systemData.redis.status} • Keys: ${systemData.redis.keys}`,
        redisColor,
        redisGlow
    );

    ctx.restore();

    return canvas.toBuffer("image/png");
}
