import { createCanvas, loadImage } from "canvas";

const W = 700; // Width of the canvas
const H = 350; // Height of the canvas
const R = 28; // Border radius for rounded corners
const AR = 60; // Avatar radius
const AG = 6; // Avatar gap (space between avatar and ring)
const AF = "https://qu.ax/jVZhH.jpg"; // Fallback avatar URL
const BG = [
    // Array of background image URLs
    "https://qu.ax/UkBQK.jpg",
    "https://qu.ax/hhKDj.jpg",
    "https://qu.ax/xuUvD.jpg",
    "https://qu.ax/iikRg.jpg",
];

const pickRandom = (arr) => arr[Math.floor(Math.random() * arr.length)];

async function loadImageSafe(url) {
    try {
        return await loadImage(url);
    } catch {
        return null;
    }
}

function roundedRectPath(ctx, x, y, w, h, r) {
    const rr = Math.min(r, w / 2, h / 2); // Ensure radius doesn't exceed half the width/height
    ctx.beginPath();
    ctx.moveTo(x + rr, y); // Start at top-left corner after radius
    ctx.arcTo(x + w, y, x + w, y + h, rr); // Top-right corner
    ctx.arcTo(x + w, y + h, x, y + h, rr); // Bottom-right corner
    ctx.arcTo(x, y + h, x, y, rr); // Bottom-left corner
    ctx.arcTo(x, y, x + w, y, rr); // Top-left corner
    ctx.closePath();
}

function drawImageCover(ctx, img, x, y, w, h) {
    const iw = img.width; // Image width
    const ih = img.height; // Image height
    const ir = iw / ih; // Image aspect ratio
    const r = w / h; // Target area aspect ratio
    let dw,
        dh,
        dx = x,
        dy = y;
    if (ir > r) {
        // Image is wider than target - fit by height
        dh = h;
        dw = h * ir;
        dx = x + (w - dw) / 2; // Center horizontally
    } else {
        dw = w;
        dh = w / ir;
        dy = y + (h - dh) / 2; // Center vertically
    }
    ctx.drawImage(img, dx, dy, dw, dh);
}

function wrapLines(ctx, text, maxWidth, maxLines = 2) {
    const words = String(text || "")
        .split(/\s+/) // Split by whitespace
        .filter(Boolean); // Remove empty strings
    const lines = [];
    let current = "";

    for (let i = 0; i < words.length; i++) {
        const test = current ? current + " " + words[i] : words[i];
        if (ctx.measureText(test).width <= maxWidth) {
            current = test; // Word fits, add it to current line
        } else {
            if (current) lines.push(current); // Save current line
            current = words[i]; // Start new line with current word
            if (lines.length >= maxLines - 1) break; // Stop if we've reached max lines
        }
    }
    if (current && lines.length < maxLines) lines.push(current); // Add remaining text

    if (lines.length === maxLines) {
        while (ctx.measureText(lines[maxLines - 1] + "…").width > maxWidth) {
            lines[maxLines - 1] = lines[maxLines - 1].replace(/.?$/, ""); // Remove last character
            if (!lines[maxLines - 1]) break;
        }
        lines[maxLines - 1] += "…"; // Add ellipsis
    }
    return lines;
}

export async function canvas(avatarUrl) {
    const cfg = {
        fontFamily: "Poppins, sans-serif",
        title: { text: "Liora Official", color: "#FFFFFF", size: 22, shadow: true },
        desc: {
            text: "© 2024 - 2025 Naruya Izumi",
            color: "#FFFFFF",
            size: 14,
            shadow: false,
        },
        overlayOpacity: 0.3, // Darkness overlay on background
        cardStroke: "#000000",
        cardStrokeWidth: 2,
        avatarRingColor: "#FFFFFF",
    };

    const canvas = createCanvas(W, H);
    const ctx = canvas.getContext("2d");
    
    ctx.fillStyle = "#23272A";
    ctx.fillRect(0, 0, W, H);
    
    roundedRectPath(ctx, 0, 0, W, H, R);
    ctx.clip();

    const bgImg = await loadImageSafe(pickRandom(BG));
    if (bgImg) {
        drawImageCover(ctx, bgImg, 0, 0, W, H);
    } else {
        ctx.fillStyle = "#23272A";
        ctx.fillRect(0, 0, W, H);
    }
    
    if (cfg.overlayOpacity > 0) {
        const g = ctx.createLinearGradient(0, H * 0.3, 0, H);
        g.addColorStop(0, `rgba(0,0,0,${cfg.overlayOpacity * 0.2})`); // Lighter at top
        g.addColorStop(1, `rgba(0,0,0,${cfg.overlayOpacity})`); // Darker at bottom
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, W, H);
    }
    
    ctx.save();
    ctx.lineWidth = cfg.cardStrokeWidth;
    ctx.strokeStyle = cfg.cardStroke;
    roundedRectPath(
        ctx,
        cfg.cardStrokeWidth / 2, // Offset to prevent clipping
        cfg.cardStrokeWidth / 2,
        W - cfg.cardStrokeWidth,
        H - cfg.cardStrokeWidth,
        R - 1
    );
    ctx.stroke();
    ctx.restore();

    const cx = W / 2;
    const cy = 120;

    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, AR + AG, 0, Math.PI * 2);
    ctx.strokeStyle = cfg.avatarRingColor;
    ctx.lineWidth = 4;
    ctx.shadowColor = "rgba(0,0,0,0.35)";
    ctx.shadowBlur = 12;
    ctx.stroke();
    ctx.restore();
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, AR, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();

    const avatarImg = (await loadImageSafe(avatarUrl || AF)) || (await loadImageSafe(AF));
    if (avatarImg) {
        drawImageCover(ctx, avatarImg, cx - AR, cy - AR, AR * 2, AR * 2);
    } else {
        ctx.fillStyle = "#3A3F47";
        ctx.fillRect(cx - AR, cy - AR, AR * 2, AR * 2);
    }
    ctx.restore();

    const textMaxWidth = Math.floor(W * 0.82); // 82% of canvas width
    const titleY = 230; // Y position for title
    const descY = 265; // Y position for description

    ctx.textAlign = "center";
    ctx.font = `bold ${cfg.title.size}px ${cfg.fontFamily}`;
    ctx.fillStyle = cfg.title.color;
    if (cfg.title.shadow) {
        ctx.shadowColor = "rgba(0,0,0,0.45)";
        ctx.shadowBlur = 8;
    }
    const titleLines = wrapLines(ctx, cfg.title.text, textMaxWidth, 1); // Max 1 line
    ctx.fillText(titleLines[0] || "", cx, titleY);
    ctx.shadowBlur = 0; // Reset shadow
    ctx.font = `normal ${cfg.desc.size}px ${cfg.fontFamily}`;
    ctx.fillStyle = cfg.desc.color;
    const descLines = wrapLines(ctx, cfg.desc.text, textMaxWidth, 2); // Max 2 lines
    if (descLines.length === 1) {
        ctx.fillText(descLines[0], cx, descY); // Single line centered
    } else {
        ctx.fillText(descLines[0], cx, descY - 12); // First line above
        ctx.fillText(descLines[1], cx, descY + 12); // Second line below
    }

    return canvas.toBuffer("image/png");
}