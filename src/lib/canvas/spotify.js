import { createCanvas, loadImage, GlobalFonts } from "@napi-rs/canvas";
import { join } from "path";

GlobalFonts.registerFromPath(join(process.cwd(), "src", "lib", "Cobbler-SemiBold.ttf"), "Cobbler");

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

function parseSpotifyDuration(durationInput) {
    if (!durationInput) return 0;

    if (typeof durationInput === "number") {
        if (durationInput > 3600 && durationInput < 86400000) {
            return Math.floor(durationInput / 1000);
        }
        return Math.floor(durationInput);
    }

    const durationString = String(durationInput);

    const parts = durationString.split(":");

    if (parts.length === 2) {
        const minutes = parseInt(parts[0], 10) || 0;
        const seconds = parseInt(parts[1], 10) || 0;
        return minutes * 60 + seconds;
    } else if (parts.length === 3) {
        const hours = parseInt(parts[0], 10) || 0;
        const minutes = parseInt(parts[1], 10) || 0;
        const seconds = parseInt(parts[2], 10) || 0;
        return hours * 3600 + minutes * 60 + seconds;
    }

    const num = parseFloat(durationString);
    if (!isNaN(num) && num > 0) {
        if (num > 3600 && num < 86400000) {
            return Math.floor(num / 1000);
        }
        return Math.floor(num);
    }

    return 0;
}

function formatTime(seconds) {
    if (!seconds || isNaN(seconds) || seconds <= 0) return "0:00";

    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    if (hours > 0) {
        return `${hours}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    }
    return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export async function canvas(coverUrl, title, artist, duration) {
    const W = 1200;
    const H = 630;

    const canvas = createCanvas(W, H);
    const ctx = canvas.getContext("2d");

    try {
        const cover = await loadImage(coverUrl);

        ctx.filter = "blur(40px)";
        ctx.drawImage(cover, -50, -50, 1300, 730);
        ctx.filter = "none";

        ctx.fillStyle = "rgba(0, 0, 0, 0.65)";
        ctx.fillRect(0, 0, W, H);
    } catch {
        const gradient = ctx.createLinearGradient(0, 0, 0, H);
        gradient.addColorStop(0, "#1a1a1a");
        gradient.addColorStop(1, "#0a0a0a");
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, W, H);
    }

    const bubbleX = 40;
    const bubbleY = 40;
    const bubbleWidth = W - 80;
    const bubbleHeight = H - 80;
    const bubbleRadius = 30;

    ctx.save();
    ctx.shadowColor = "rgba(0, 0, 0, 0.5)";
    ctx.shadowBlur = 40;
    ctx.shadowOffsetY = 20;
    ctx.fillStyle = "rgba(255, 255, 255, 0.08)";
    drawRoundedRect(ctx, bubbleX, bubbleY, bubbleWidth, bubbleHeight, bubbleRadius);
    ctx.fill();
    ctx.restore();

    const bubbleGradient = ctx.createLinearGradient(
        bubbleX,
        bubbleY,
        bubbleX,
        bubbleY + bubbleHeight
    );
    bubbleGradient.addColorStop(0, "rgba(255, 255, 255, 0.15)");
    bubbleGradient.addColorStop(0.5, "rgba(255, 255, 255, 0.08)");
    bubbleGradient.addColorStop(1, "rgba(255, 255, 255, 0.12)");
    ctx.fillStyle = bubbleGradient;
    drawRoundedRect(ctx, bubbleX, bubbleY, bubbleWidth, bubbleHeight, bubbleRadius);
    ctx.fill();

    ctx.strokeStyle = "rgba(255, 255, 255, 0.2)";
    ctx.lineWidth = 1.5;
    drawRoundedRect(ctx, bubbleX, bubbleY, bubbleWidth, bubbleHeight, bubbleRadius);
    ctx.stroke();

    const coverSize = 420;
    const coverX = bubbleX + 60;
    const coverY = bubbleY + 65;
    const coverRadius = 24;

    try {
        const cover = await loadImage(coverUrl);

        ctx.save();
        ctx.shadowColor = "rgba(0, 0, 0, 0.6)";
        ctx.shadowBlur = 35;
        ctx.shadowOffsetY = 15;
        ctx.beginPath();
        drawRoundedRect(ctx, coverX, coverY, coverSize, coverSize, coverRadius);
        ctx.closePath();
        ctx.clip();

        ctx.drawImage(cover, coverX, coverY, coverSize, coverSize);

        ctx.restore();

        ctx.strokeStyle = "rgba(255, 255, 255, 0.3)";
        ctx.lineWidth = 2;
        drawRoundedRect(ctx, coverX, coverY, coverSize, coverSize, coverRadius);
        ctx.stroke();
    } catch {
        const gradient = ctx.createLinearGradient(coverX, coverY, coverX, coverY + coverSize);
        gradient.addColorStop(0, "#1DB954");
        gradient.addColorStop(1, "#191414");
        ctx.fillStyle = gradient;
        drawRoundedRect(ctx, coverX, coverY, coverSize, coverSize, coverRadius);
        ctx.fill();
    }

    const infoX = coverX + coverSize + 60;
    const infoMaxWidth = bubbleX + bubbleWidth - infoX - 60;
    let infoY = bubbleY + 90;

    const logoSize = 32;
    try {
        const logo = await loadImage(
            "https://storage.googleapis.com/pr-newsroom-wp/1/2023/05/Spotify_Primary_Logo_RGB_White.png"
        );
        ctx.save();
        ctx.globalAlpha = 0.9;

        const sourceSize = Math.min(logo.width, logo.height);
        const sourceX = (logo.width - sourceSize) / 2;
        const sourceY = (logo.height - sourceSize) / 2;
        ctx.drawImage(
            logo,
            sourceX,
            sourceY,
            sourceSize,
            sourceSize,
            infoX,
            infoY - 8,
            logoSize,
            logoSize
        );
        ctx.restore();
    } catch {
        ctx.fillStyle = "#1DB954";
        ctx.beginPath();
        ctx.arc(infoX + logoSize / 2, infoY + logoSize / 2 - 8, logoSize / 2, 0, Math.PI * 2);
        ctx.fill();
    }

    ctx.fillStyle = "rgba(255, 255, 255, 0.8)";
    ctx.font = "18px Cobbler";
    ctx.textAlign = "left";
    ctx.fillText("Spotify", infoX + logoSize + 12, infoY + 5);

    infoY += 90;

    ctx.save();
    ctx.shadowColor = "rgba(255, 255, 255, 0.3)";
    ctx.shadowBlur = 20;
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 46px Cobbler";

    let displayTitle = title;
    let titleWidth = ctx.measureText(displayTitle).width;

    if (titleWidth > infoMaxWidth) {
        while (titleWidth > infoMaxWidth && displayTitle.length > 0) {
            displayTitle = displayTitle.slice(0, -1);
            titleWidth = ctx.measureText(displayTitle + "...").width;
        }
        displayTitle += "...";
    }

    ctx.fillText(displayTitle, infoX, infoY);
    ctx.restore();

    infoY += 65;

    ctx.fillStyle = "rgba(255, 255, 255, 0.75)";
    ctx.font = "32px Cobbler";

    let displayArtist = artist;
    let artistWidth = ctx.measureText(displayArtist).width;

    if (artistWidth > infoMaxWidth) {
        while (artistWidth > infoMaxWidth && displayArtist.length > 0) {
            displayArtist = displayArtist.slice(0, -1);
            artistWidth = ctx.measureText(displayArtist + "...").width;
        }
        displayArtist += "...";
    }

    ctx.fillText(displayArtist, infoX, infoY);

    infoY += 100;

    const progressWidth = infoMaxWidth;
    const progressHeight = 6;
    const progressRadius = 3;

    ctx.fillStyle = "rgba(255, 255, 255, 0.2)";
    drawRoundedRect(ctx, infoX, infoY, progressWidth, progressHeight, progressRadius);
    ctx.fill();

    const fillWidth = 0;
    const progressGradient = ctx.createLinearGradient(infoX, infoY, infoX + fillWidth, infoY);
    progressGradient.addColorStop(0, "#ffffff");
    progressGradient.addColorStop(1, "rgba(255, 255, 255, 0.8)");
    ctx.fillStyle = progressGradient;
    drawRoundedRect(ctx, infoX, infoY, fillWidth, progressHeight, progressRadius);
    ctx.fill();

    const knobX = infoX;
    const knobRadius = 11;
    ctx.save();
    ctx.shadowColor = "rgba(255, 255, 255, 0.5)";
    ctx.shadowBlur = 15;
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(knobX, infoY + progressHeight / 2, knobRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    infoY += 40;

    const totalDuration = parseSpotifyDuration(duration);

    ctx.fillStyle = "rgba(255, 255, 255, 0.7)";
    ctx.font = "20px Cobbler";
    ctx.textAlign = "left";
    ctx.fillText("0:00", infoX, infoY);

    ctx.textAlign = "right";
    ctx.fillText(formatTime(totalDuration), infoX + progressWidth, infoY);

    return canvas.toBuffer("image/png");
}

export default canvas;
