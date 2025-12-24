import { createCanvas, loadImage, GlobalFonts } from "@napi-rs/canvas";
import { join } from "path";

GlobalFonts.registerFromPath(join(process.cwd(), "src", "lib", "Cobbler-SemiBold.ttf"), "Cobbler");

function roundRect(ctx, x, y, w, h, r) {
    if (w < 2 * r) r = w / 2;
    if (h < 2 * r) r = h / 2;
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
}

function drawCard(ctx, x, y, w, h, r = 12) {
    ctx.save();
    ctx.shadowColor = "rgba(0, 0, 0, 0.15)";
    ctx.shadowBlur = 30;
    ctx.shadowOffsetY = 12;
    roundRect(ctx, x, y, w, h, r);
    ctx.fillStyle = "#FFFFFF";
    ctx.fill();
    ctx.strokeStyle = "rgba(0, 0, 0, 0.08)";
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.restore();
}

function drawSearchBar(ctx, x, y, w, h, query) {
    ctx.save();

    ctx.shadowColor = "rgba(0, 0, 0, 0.1)";
    ctx.shadowBlur = 20;
    ctx.shadowOffsetY = 5;
    roundRect(ctx, x, y, w, h, h / 2);
    ctx.fillStyle = "#FFFFFF";
    ctx.fill();
    ctx.strokeStyle = "rgba(0, 0, 0, 0.1)";
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.strokeStyle = "#666666";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(x + 30, y + h / 2, 10, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x + 37, y + h / 2 + 7);
    ctx.lineTo(x + 43, y + h / 2 + 13);
    ctx.stroke();

    ctx.fillStyle = "#1A1A1A";
    ctx.font = "26px Cobbler";
    ctx.textAlign = "left";
    ctx.fillText(query, x + 60, y + h / 2 + 9);

    const cursorX = x + 60 + ctx.measureText(query).width + 5;
    ctx.fillStyle = "#FF3B30";
    ctx.fillRect(cursorX, y + h / 2 - 12, 2, 24);

    ctx.restore();
}

function drawDotGrid(ctx, x, y, w, h, spacing = 25, opacity = 0.15) {
    ctx.save();
    ctx.fillStyle = `rgba(255, 59, 48, ${opacity})`;

    for (let i = 0; i < w; i += spacing) {
        for (let j = 0; j < h; j += spacing) {
            ctx.beginPath();
            ctx.arc(x + i, y + j, 1.5, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    ctx.restore();
}

function drawStatsCard(ctx, x, y, w, h, title, value, color) {
    ctx.save();

    roundRect(ctx, x, y, w, h, 12);
    const gradient = ctx.createLinearGradient(x, y, x, y + h);
    gradient.addColorStop(0, "#2D2D2D");
    gradient.addColorStop(0.7, "#222222");
    gradient.addColorStop(1, "#1A1A1A");
    ctx.fillStyle = gradient;
    ctx.fill();

    drawDotGrid(ctx, x + 10, y + 10, w - 20, h - 20, 20, 0.08);

    ctx.fillStyle = "#BBBBBB";
    ctx.font = "bold 16px Cobbler";
    ctx.textAlign = "left";
    ctx.fillText(title, x + 20, y + 40);

    ctx.fillStyle = color;
    ctx.font = "bold 40px Cobbler";
    ctx.fillText(value, x + 20, y + 95);

    ctx.fillStyle = color;
    ctx.fillRect(x + 20, y + h - 8, 45, 4);

    ctx.restore();
}

function parseDuration(duration) {
    if (!duration || duration === "0:00") return 0;
    const parts = duration.split(":").map(Number);
    if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
    if (parts.length === 2) return parts[0] * 60 + parts[1];
    return parts[0] || 0;
}

function formatDuration(seconds) {
    if (!seconds) return "0:00";
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hrs > 0) {
        return `${hrs}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    }
    return `${mins}:${secs.toString().padStart(2, "0")}`;
}

function drawInfoBadge(ctx, x, y, text, color) {
    ctx.save();

    const padding = 15;
    const height = 35;
    const textWidth = ctx.measureText(text).width;
    const width = textWidth + padding * 2;

    roundRect(ctx, x, y, width, height, 8);
    ctx.fillStyle = color + "20";
    ctx.fill();
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = color;
    ctx.font = "bold 16px Cobbler";
    ctx.textAlign = "center";
    ctx.fillText(text, x + width / 2, y + height / 2 + 5);

    ctx.restore();

    return width;
}

export async function canvas(videos, query) {
    const HD_SCALE = 2;
    const BASE_WIDTH = 1400;
    const BASE_HEIGHT = 1500;

    const W = BASE_WIDTH * HD_SCALE;
    const H = BASE_HEIGHT * HD_SCALE;

    const canvas = createCanvas(W, H);
    const ctx = canvas.getContext("2d");

    ctx.antialias = "default";
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.textDrawingMode = "glyph";

    ctx.scale(HD_SCALE, HD_SCALE);

    const bgGradient = ctx.createLinearGradient(0, 0, 0, BASE_HEIGHT);
    bgGradient.addColorStop(0, "#FFFFFF");
    bgGradient.addColorStop(0.4, "#F8F8F8");
    bgGradient.addColorStop(0.8, "#F0F0F0");
    bgGradient.addColorStop(1, "#E8E8E8");
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, BASE_WIDTH, BASE_HEIGHT);

    drawDotGrid(ctx, 0, 0, BASE_WIDTH, BASE_HEIGHT, 30, 0.03);

    const displayVideos = videos.slice(0, 9);
    const thumbnails = await Promise.all(
        displayVideos.map(async (video) => {
            try {
                return await loadImage(video.cover);
            } catch {
                return null;
            }
        })
    );

    const ytLogo = await loadImage("https://cdn-icons-png.flaticon.com/512/1384/1384060.png");

    const padding = 50;

    ctx.fillStyle = "#0F0F0F";
    ctx.fillRect(0, 0, BASE_WIDTH, 180);

    drawDotGrid(ctx, 0, 0, BASE_WIDTH, 180, 25, 0.05);

    ctx.drawImage(ytLogo, padding, padding - 5, 55, 55);

    ctx.fillStyle = "#FFFFFF";
    ctx.font = "bold 42px Cobbler";
    ctx.textAlign = "left";
    ctx.fillText("YouTube Search", padding + 75, padding + 40);

    const searchBarY = padding + 60;
    const searchBarW = 600;
    const searchBarH = 50;
    drawSearchBar(ctx, padding + 75, searchBarY, searchBarW, searchBarH, query);

    const badgeY = padding + 75;
    let badgeX = BASE_WIDTH - padding;

    ctx.font = "bold 16px Cobbler";

    const totalVideos = videos.length;
    const w1 = drawInfoBadge(ctx, badgeX - 120, badgeY, `${totalVideos} results`, "#FF3B30");
    badgeX -= w1 + 15;

    const totalChannels = new Set(videos.slice(0, 20).map((v) => v.channel)).size;
    drawInfoBadge(ctx, badgeX - 130, badgeY, `${totalChannels} channels`, "#007AFF");

    const statsY = 200;
    const cardW = (BASE_WIDTH - padding * 2 - 60) / 4;
    const cardH = 130;
    const cardGap = 20;

    const totalDuration = videos
        .slice(0, 20)
        .reduce((sum, v) => sum + parseDuration(v.duration), 0);
    const avgDuration = Math.floor(totalDuration / Math.min(videos.length, 20));

    const totalWatchTime = videos
        .slice(0, 20)
        .reduce((sum, v) => sum + parseDuration(v.duration), 0);

    const statsCards = [
        {
            title: "TOTAL RESULTS",
            value: videos.length.toString(),
            color: "#FF3B30",
        },
        {
            title: "AVG DURATION",
            value: formatDuration(avgDuration),
            color: "#007AFF",
        },
        {
            title: "TOTAL WATCH TIME",
            value: formatDuration(totalWatchTime),
            color: "#34C759",
        },
        {
            title: "CHANNELS",
            value: new Set(videos.slice(0, 20).map((v) => v.channel)).size.toString(),
            color: "#FF9500",
        },
    ];

    statsCards.forEach((card, i) => {
        const cardX = padding + i * (cardW + cardGap);
        drawStatsCard(ctx, cardX, statsY, cardW, cardH, card.title, card.value, card.color);
    });

    const albumY = statsY + cardH + 40;
    const videoCardW = (BASE_WIDTH - padding * 2 - 40) / 3;
    const videoCardH = 320;
    const videoGap = 20;
    const cols = 3;

    for (let i = 0; i < displayVideos.length && i < 9; i++) {
        const col = i % cols;
        const row = Math.floor(i / cols);
        const x = padding + col * (videoCardW + videoGap);
        const y = albumY + row * (videoCardH + videoGap);

        drawCard(ctx, x, y, videoCardW, videoCardH, 12);

        if (thumbnails[i]) {
            const thumbH = 190;
            const img = thumbnails[i];

            ctx.save();
            roundRect(ctx, x + 15, y + 15, videoCardW - 30, thumbH, 8);
            ctx.clip();

            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = "high";

            const scale = Math.max((videoCardW - 30) / img.width, thumbH / img.height);
            const sw = (videoCardW - 30) / scale;
            const sh = thumbH / scale;
            const sx = (img.width - sw) / 2;
            const sy = (img.height - sh) / 2;

            ctx.drawImage(img, sx, sy, sw, sh, x + 15, y + 15, videoCardW - 30, thumbH);

            const overlayGrad = ctx.createLinearGradient(
                x + 15,
                y + 15 + thumbH - 60,
                x + 15,
                y + 15 + thumbH
            );
            overlayGrad.addColorStop(0, "rgba(0, 0, 0, 0)");
            overlayGrad.addColorStop(1, "rgba(0, 0, 0, 0.85)");
            ctx.fillStyle = overlayGrad;
            ctx.fillRect(x + 15, y + 15, videoCardW - 30, thumbH);

            ctx.restore();

            const video = displayVideos[i];
            if (video.duration) {
                const badgeW = 65;
                const badgeH = 28;
                const badgeX = x + videoCardW - 30 - badgeW - 5;
                const badgeY = y + 15 + thumbH - badgeH - 5;

                ctx.fillStyle = "rgba(0, 0, 0, 0.9)";
                roundRect(ctx, badgeX, badgeY, badgeW, badgeH, 6);
                ctx.fill();

                ctx.fillStyle = "#FFFFFF";
                ctx.font = "bold 14px Cobbler";
                ctx.textAlign = "center";
                ctx.fillText(video.duration, badgeX + badgeW / 2, badgeY + badgeH / 2 + 4);
            }
        }

        const video = displayVideos[i];
        const infoY = y + 225;

        ctx.fillStyle = "#1A1A1A";
        ctx.font = "bold 18px Cobbler";
        ctx.textAlign = "left";

        let title = video.title;
        const maxTitleW = videoCardW - 40;
        let measuredWidth = ctx.measureText(title).width;

        if (measuredWidth > maxTitleW) {
            let truncated = title;
            while (ctx.measureText(truncated + "...").width > maxTitleW && truncated.length > 0) {
                truncated = truncated.slice(0, -1);
            }
            title = truncated + "...";
        }

        ctx.fillText(title, x + 20, infoY);

        ctx.fillStyle = "#666666";
        ctx.font = "bold 16px Cobbler";
        ctx.fillText(video.channel, x + 20, infoY + 32);

        ctx.fillStyle = "#FF3B30";
        ctx.beginPath();
        ctx.arc(x + 20, infoY + 60, 6, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = "#FF3B30";
        ctx.font = "bold 16px Cobbler";
        ctx.fillText(`Video ${i + 1}`, x + 35, infoY + 65);

        ctx.strokeStyle = "rgba(0, 0, 0, 0.05)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x + 20, infoY + 85);
        ctx.lineTo(x + videoCardW - 20, infoY + 85);
        ctx.stroke();
    }

    const footerY = BASE_HEIGHT - 80;

    ctx.fillStyle = "rgba(15, 15, 15, 0.03)";
    ctx.fillRect(0, footerY, BASE_WIDTH, 80);

    ctx.strokeStyle = "rgba(0, 0, 0, 0.1)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(padding, footerY);
    ctx.lineTo(BASE_WIDTH - padding, footerY);
    ctx.stroke();

    ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
    ctx.font = "16px Cobbler";
    ctx.textAlign = "center";
    ctx.fillText(
        `Generated on ${new Date().toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        })}`,
        BASE_WIDTH / 2,
        footerY + 35
    );

    ctx.fillStyle = "rgba(0, 0, 0, 0.35)";
    ctx.font = "14px Cobbler";
    ctx.fillText(
        `${videos.length} videos analyzed • ${totalChannels} unique channels`,
        BASE_WIDTH / 2,
        footerY + 60
    );

    ctx.fillStyle = "rgba(0, 0, 0, 0.3)";
    ctx.font = "bold 12px Cobbler";
    ctx.textAlign = "right";
    ctx.fillText("YouTube Analytics", BASE_WIDTH - padding, footerY + 60);

    return canvas.toBuffer("image/png", {
        compressionLevel: 0,
        filters: canvas.PNG_ALL_FILTERS,
    });
}
