import { createCanvas, loadImage, GlobalFonts } from "@napi-rs/canvas";
import { join } from "path";

GlobalFonts.registerFromPath(join(process.cwd(), "lib", "Cobbler-SemiBold.ttf"),
  "Cobbler");
GlobalFonts.registerFromPath(join(process.cwd(), "lib", "Cobbler-SemiBold.ttf"),
  "Cobbler-Bold");

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

function drawCard(ctx, x, y, w, h, r = 12, color = "#FFFFFF") {
  ctx.save();
  ctx.shadowColor = "rgba(0, 0, 0, 0.12)";
  ctx.shadowBlur = 25;
  ctx.shadowOffsetY = 10;
  roundRect(ctx, x, y, w, h, r);
  ctx.fillStyle = color;
  ctx.fill();
  ctx.strokeStyle = "rgba(0, 0, 0, 0.08)";
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.restore();
}

function drawDarkCard(ctx, x, y, w, h, r = 12) {
  ctx.save();
  ctx.shadowColor = "rgba(0, 0, 0, 0.2)";
  ctx.shadowBlur = 35;
  ctx.shadowOffsetY = 15;
  roundRect(ctx, x, y, w, h, r);
  const gradient = ctx.createLinearGradient(x, y, x, y + h);
  gradient.addColorStop(0, "#2A2A2A");
  gradient.addColorStop(0.6, "#1E1E1E");
  gradient.addColorStop(1, "#121212");
  ctx.fillStyle = gradient;
  ctx.fill();
  ctx.strokeStyle = "rgba(255, 255, 255, 0.06)";
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.restore();
}

function formatNumber(num) {
  if (!num && num !== 0) return "0";
  if (num >= 1e9) return (num / 1e9).toFixed(1).replace(/.0$/, "") + "B";
  if (num >= 1e6) return (num / 1e6).toFixed(1).replace(/.0$/, "") + "M";
  if (num >= 1e3) return (num / 1e3).toFixed(1).replace(/.0$/, "") + "K";
  return num.toString();
}

function parseDuration(timestamp) {
  if (!timestamp) return 0;
  const parts = timestamp.split(":").map(Number);
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return parts[0] || 0;
}

async function loadIcon(url) {
  try {
    return await loadImage(url);
  } catch {
    return null;
  }
}

function drawBarChart(ctx, x, y, w, h, videos) {
  ctx.save();

  const data = videos.slice(0, 20).map(v => v.views || 0);
  if (data.length === 0) {
    ctx.restore();
    return;
  }

  const maxViews = Math.max(...data);
  const minViews = Math.min(...data);
  const range = maxViews - minViews || 1;

  const padding = { top: 50, right: 60, bottom: 80, left: 70 };
  const chartW = w - padding.left - padding.right;
  const chartH = h - padding.top - padding.bottom;

  ctx.strokeStyle = "rgba(255, 255, 255, 0.15)";
  ctx.lineWidth = 1;
  ctx.setLineDash([3, 3]);
  for (let i = 0; i <= 5; i++) {
    const gridY = y + padding.top + (chartH / 5) * i;
    ctx.beginPath();
    ctx.moveTo(x + padding.left, gridY);
    ctx.lineTo(x + w - padding.right, gridY);
    ctx.stroke();
  }
  ctx.setLineDash([]);

  ctx.fillStyle = "#AAAAAA";
  ctx.font = "14px Cobbler";
  ctx.textAlign = "right";
  for (let i = 0; i <= 5; i++) {
    const value = maxViews - (range * (i / 5));
    const labelY = y + padding.top + (chartH / 5) * i + 5;
    ctx.fillText(formatNumber(value), x + padding.left - 15, labelY);
  }

  const stepX = chartW / data.length;
  const barWidth = Math.min(stepX * 0.6, 40);
  const marginLeftBars = barWidth / 2 + 15;

  data.forEach((views, i) => {
    const px = x + padding.left + marginLeftBars + stepX * i;
    const barHeight = ((views - minViews) / range) * chartH;
    const py = y + padding.top + chartH - barHeight;

    const grad = ctx.createLinearGradient(px, py, px, y + padding.top + chartH);
    grad.addColorStop(0, "#FF3B30");
    grad.addColorStop(1, "rgba(255,59,48,0.4)");
    ctx.fillStyle = grad;
    ctx.fillRect(px - barWidth / 2, py, barWidth, barHeight);

    ctx.fillStyle = "#FFFFFF";
    ctx.font = "bold 13px Cobbler";
    ctx.textAlign = "center";
    ctx.fillText(formatNumber(views), px, py - 10);

    ctx.fillStyle = "#888888";
    ctx.font = "14px Cobbler";
    ctx.textAlign = "center";
    ctx.fillText(`Video ${i + 1}`, px, y + h - padding.bottom + 40);
  });

  ctx.restore();
}

function drawStatsCard(ctx, x, y, w, h, title, value, icon, color) {
  ctx.save();
  roundRect(ctx, x, y, w, h, 12);
  const gradient = ctx.createLinearGradient(x, y, x, y + h);
  gradient.addColorStop(0, "#2D2D2D");
  gradient.addColorStop(0.7, "#222222");
  gradient.addColorStop(1, "#1A1A1A");
  ctx.fillStyle = gradient;
  ctx.fill();
  if (icon) {
    ctx.save();
    ctx.globalAlpha = 0.15;
    ctx.drawImage(icon, x + w - 65, y + 15, 45, 45);
    ctx.restore();
  }
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

export async function canvas(videos, query) {
  const W = 1400;
  const H = 1600;
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext("2d");
  
  const bgGradient = ctx.createLinearGradient(0, 0, 0, H);
  bgGradient.addColorStop(0, "#FFFFFF");
  bgGradient.addColorStop(0.4, "#F8F8F8");
  bgGradient.addColorStop(0.8, "#F0F0F0");
  bgGradient.addColorStop(1, "#E8E8E8");
  ctx.fillStyle = bgGradient;
  ctx.fillRect(0, 0, W, H);
  
  const displayVideos = videos.slice(0, 6);
  const thumbnails = await Promise.all(
    displayVideos.map(async (video) => {
      try {
        return await loadImage(video.thumbnail);
      } catch {
        return null;
      }
    })
  );
  
  const ytLogo = await loadImage(
    "https://cdn-icons-png.flaticon.com/512/1384/1384060.png");
  const eyeIcon = await loadIcon(
    "https://cdn-icons-png.flaticon.com/512/709/709612.png");
  const chartIcon = await loadIcon(
    "https://cdn-icons-png.flaticon.com/512/3135/3135757.png");
  const videoIcon = await loadIcon(
    "https://cdn-icons-png.flaticon.com/512/2991/2991147.png");
  const clockIcon = await loadIcon(
    "https://cdn-icons-png.flaticon.com/512/2088/2088617.png");
  
  const padding = 50;
  
  ctx.fillStyle = "#0F0F0F";
  ctx.fillRect(0, 0, W, 180);
  
  ctx.drawImage(ytLogo, padding, padding - 5, 55, 55);
  
  ctx.fillStyle = "#FFFFFF";
  ctx.font = "bold 42px Cobbler";
  ctx.textAlign = "left";
  ctx.fillText("YouTube Search Analytics", padding + 75, padding + 40);
  
  ctx.fillStyle = "#FF3B30";
  ctx.font = "28px Cobbler";
  ctx.fillText(`"${query}"`, padding + 75, padding + 85);
  
  const statsY = 200;
  const cardW = (W - padding * 2 - 60) / 4;
  const cardH = 130;
  const cardGap = 20;
  
  const totalViews = videos.slice(0, 6).reduce((sum, v) => sum + (v.views ||
    0), 0);
  const avgViews = Math.floor(totalViews / 6);
  const totalDuration = videos.slice(0, 6).reduce((sum, v) => sum +
    parseDuration(v.timestamp), 0);
  const avgDuration = Math.floor(totalDuration / 6);
  const avgMins = Math.floor(avgDuration / 60);
  const avgSecs = avgDuration % 60;
  
  const statsCards = [
    { title: "TOTAL RESULTS", value: videos.length.toString(),
      icon: chartIcon, color: "#FF3B30" },
    { title: "TOTAL VIEWS", value: formatNumber(totalViews), icon: eyeIcon,
      color: "#007AFF" },
    { title: "AVG VIEWS", value: formatNumber(avgViews), icon: videoIcon,
      color: "#34C759" },
    { title: "AVG DURATION",
      value: `${avgMins}:${avgSecs.toString().padStart(2, '0')}`,
      icon: clockIcon, color: "#FF9500" }
  ];
  
  statsCards.forEach((card, i) => {
    const cardX = padding + i * (cardW + cardGap);
    drawStatsCard(ctx, cardX, statsY, cardW, cardH, card.title, card
      .value, card.icon, card.color);
  });
  
  const gridY = statsY + cardH + 40;
  const videoCardW = (W - padding * 2 - 40) / 3;
  const videoCardH = 320;
  const videoGap = 20;
  const cols = 3;
  
  for (let i = 0; i < displayVideos.length && i < 6; i++) {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const x = padding + col * (videoCardW + videoGap);
    const y = gridY + row * (videoCardH + videoGap);
    
    drawCard(ctx, x, y, videoCardW, videoCardH, 12, "#FFFFFF");
    
    if (thumbnails[i]) {
      const thumbH = 190;
      const img = thumbnails[i];
      
      ctx.save();
      roundRect(ctx, x + 15, y + 15, videoCardW - 30, thumbH, 8);
      ctx.clip();
      
      const scale = Math.max((videoCardW - 30) / img.width, thumbH / img
        .height);
      const sw = (videoCardW - 30) / scale;
      const sh = thumbH / scale;
      const sx = (img.width - sw) / 2;
      const sy = (img.height - sh) / 2;
      
      ctx.drawImage(img, sx, sy, sw, sh, x + 15, y + 15, videoCardW - 30,
        thumbH);
      
      const overlayGrad = ctx.createLinearGradient(x + 15, y + 15 + thumbH -
        40, x + 15, y + 15 + thumbH);
      overlayGrad.addColorStop(0, "rgba(0, 0, 0, 0)");
      overlayGrad.addColorStop(1, "rgba(0, 0, 0, 0.8)");
      ctx.fillStyle = overlayGrad;
      ctx.fillRect(x + 15, y + 15, videoCardW - 30, thumbH);
      
      ctx.restore();
      
      const video = displayVideos[i];
      if (video.timestamp) {
        const badgeW = 65;
        const badgeH = 28;
        const badgeX = x + videoCardW - 30 - badgeW - 5;
        const badgeY = y + 15 + thumbH - badgeH - 5;
        
        ctx.fillStyle = "rgba(0, 0, 0, 0.85)";
        roundRect(ctx, badgeX, badgeY, badgeW, badgeH, 6);
        ctx.fill();
        
        ctx.fillStyle = "#FFFFFF";
        ctx.font = "bold 14px Cobbler";
        ctx.textAlign = "center";
        ctx.fillText(video.timestamp, badgeX + badgeW / 2, badgeY + badgeH /
          2 + 4);
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
      while (ctx.measureText(truncated + "...").width > maxTitleW && truncated
        .length > 0) {
        truncated = truncated.slice(0, -1);
      }
      title = truncated + "...";
    }
    
    ctx.fillText(title, x + 20, infoY);
    
    ctx.fillStyle = "#666666";
    ctx.font = "bold 16px Cobbler";
    ctx.fillText(video.author.name, x + 20, infoY + 32);
    
    ctx.fillStyle = "#FF3B30";
    ctx.font = "bold 18px Cobbler";
    ctx.fillText(`${formatNumber(video.views)} views`, x + 20, infoY + 70);
    
    ctx.strokeStyle = "rgba(0, 0, 0, 0.05)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x + 20, infoY + 85);
    ctx.lineTo(x + videoCardW - 20, infoY + 85);
    ctx.stroke();
  }
  
  const chartsY = gridY + (videoCardH + videoGap) * 2 + 40;
  const chartCardW = W - padding * 2;
  const chartCardH = H - chartsY - padding - 50;
  
  drawDarkCard(ctx, padding, chartsY, chartCardW, chartCardH);
  
  ctx.fillStyle = "#FFFFFF";
  ctx.font = "bold 32px Cobbler";
  ctx.textAlign = "left";
  ctx.fillText("VIEWS TREND ANALYSIS", padding + 30, chartsY + 50);
  
  ctx.fillStyle = "#BBBBBB";
  ctx.font = "18px Cobbler";
  ctx.fillText(`Top 10 videos progression for "${query}"`, padding + 30,
    chartsY + 85);
  
  drawBarChart(ctx, padding, chartsY + 100, chartCardW, chartCardH - 100,
    videos);
  
  ctx.fillStyle = "rgba(0, 0, 0, 0.4)";
  ctx.font = "14px Cobbler";
  ctx.textAlign = "center";
  ctx.fillText(`Generated on ${new Date().toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })} • ${videos.length} videos analyzed`, W / 2, H - 25);
  
  ctx.fillStyle = "rgba(0, 0, 0, 0.2)";
  ctx.font = "12px Cobbler";
  ctx.textAlign = "right";
  ctx.fillText("YouTube Analytics", W - padding, H - 25);
  
  return canvas.toBuffer("image/png");
}