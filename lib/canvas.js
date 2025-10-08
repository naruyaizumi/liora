import { createCanvas, loadImage } from "canvas";

const W = 700;
const H = 350;
const R = 28;
const AR = 60;
const AG = 6;
const AF = "https://qu.ax/jVZhH.jpg";
const BG = [
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
    const rr = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + rr, y);
    ctx.arcTo(x + w, y, x + w, y + h, rr);
    ctx.arcTo(x + w, y + h, x, y + h, rr);
    ctx.arcTo(x, y + h, x, y, rr);
    ctx.arcTo(x, y, x + w, y, rr);
    ctx.closePath();
}

function drawImageCover(ctx, img, x, y, w, h) {
    const iw = img.width;
    const ih = img.height;
    const ir = iw / ih;
    const r = w / h;
    let dw = w,
        dh = h,
        dx = x,
        dy = y;
    if (ir > r) {
        dh = h;
        dw = h * ir;
        dx = x + (w - dw) / 2;
    } else {
        dw = w;
        dh = w / ir;
        dy = y + (h - dh) / 2;
    }
    ctx.drawImage(img, dx, dy, dw, dh);
}

function wrapLines(ctx, text, maxWidth, maxLines = 2) {
    const words = String(text || "")
        .split(/\s+/)
        .filter(Boolean);
    const lines = [];
    let current = "";

    for (let i = 0; i < words.length; i++) {
        const test = current ? current + " " + words[i] : words[i];
        if (ctx.measureText(test).width <= maxWidth) {
            current = test;
        } else {
            if (current) lines.push(current);
            current = words[i];
            if (lines.length >= maxLines - 1) break;
        }
    }
    if (current && lines.length < maxLines) lines.push(current);

    if (lines.length === maxLines) {
        while (ctx.measureText(lines[maxLines - 1] + "…").width > maxWidth) {
            lines[maxLines - 1] = lines[maxLines - 1].replace(/.?$/, "");
            if (!lines[maxLines - 1]) break;
        }
        lines[maxLines - 1] += "…";
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
        overlayOpacity: 0.3,
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
        g.addColorStop(0, `rgba(0,0,0,${cfg.overlayOpacity * 0.2})`);
        g.addColorStop(1, `rgba(0,0,0,${cfg.overlayOpacity})`);
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, W, H);
    }
    ctx.save();
    ctx.lineWidth = cfg.cardStrokeWidth;
    ctx.strokeStyle = cfg.cardStroke;
    roundedRectPath(
        ctx,
        cfg.cardStrokeWidth / 2,
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

    const textMaxWidth = Math.floor(W * 0.82);
    const titleY = 230;
    const descY = 265;

    ctx.textAlign = "center";
    ctx.font = `bold ${cfg.title.size}px ${cfg.fontFamily}`;
    ctx.fillStyle = cfg.title.color;
    if (cfg.title.shadow) {
        ctx.shadowColor = "rgba(0,0,0,0.45)";
        ctx.shadowBlur = 8;
    }
    const titleLines = wrapLines(ctx, cfg.title.text, textMaxWidth, 1);
    ctx.fillText(titleLines[0] || "", cx, titleY);
    ctx.shadowBlur = 0;
    ctx.font = `normal ${cfg.desc.size}px ${cfg.fontFamily}`;
    ctx.fillStyle = cfg.desc.color;
    const descLines = wrapLines(ctx, cfg.desc.text, textMaxWidth, 2);
    if (descLines.length === 1) {
        ctx.fillText(descLines[0], cx, descY);
    } else {
        ctx.fillText(descLines[0], cx, descY - 12);
        ctx.fillText(descLines[1], cx, descY + 12);
    }

    return canvas.toBuffer("image/png");
}
