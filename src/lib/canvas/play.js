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

export async function canvas(coverUrl, title, artist) {
    const W = 1200;
    const H = 630;

    const canvas = createCanvas(W, H);
    const ctx = canvas.getContext("2d");

    try {
        const cover = await loadImage(coverUrl);

        ctx.filter = "blur(20px) brightness(0.8)";
        ctx.drawImage(cover, -50, -50, 1300, 730);
        ctx.filter = "none";

        ctx.fillStyle = "rgba(0, 0, 0, 0.3)";
        ctx.fillRect(0, 0, W, H);
    } catch {
        const gradient = ctx.createLinearGradient(0, 0, 0, H);
        gradient.addColorStop(0, "#0f0f0f");
        gradient.addColorStop(1, "#000000");
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, W, H);
    }

    const containerWidth = 800;
    const containerHeight = 400;
    const containerX = W - containerWidth - 60;
    const containerY = (H - containerHeight) / 2;
    const containerRadius = 25;

    ctx.save();
    ctx.shadowColor = "rgba(0, 0, 0, 0.8)";
    ctx.shadowBlur = 40;
    ctx.shadowOffsetY = 20;
    ctx.fillStyle = "rgba(0, 0, 0, 0.4)";
    drawRoundedRect(ctx, containerX, containerY, containerWidth, containerHeight, containerRadius);
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.fillStyle = "rgba(255, 255, 255, 0.05)";
    drawRoundedRect(ctx, containerX, containerY, containerWidth, containerHeight, containerRadius);
    ctx.fill();

    ctx.strokeStyle = "rgba(255, 255, 255, 0.15)";
    ctx.lineWidth = 1;
    drawRoundedRect(ctx, containerX, containerY, containerWidth, containerHeight, containerRadius);
    ctx.stroke();
    ctx.restore();

    const logoWidth = 100;
    const logoHeight = 22;
    const logoX = containerX + 40;
    const logoY = containerY + 50;

    try {
        const logo = await loadImage(
            "https://upload.wikimedia.org/wikipedia/commons/thumb/0/08/YouTube_light_logo_%282024%29.svg/1280px-YouTube_light_logo_%282024%29.svg.png"
        );
        ctx.save();
        ctx.globalAlpha = 0.9;
        ctx.drawImage(logo, logoX, logoY, logoWidth, logoHeight);
        ctx.restore();
    } catch {
        ctx.fillStyle = "#FFFFFF";
        ctx.font = "bold 20px Cobbler";
        ctx.fillText("YouTube", logoX, logoY + 15);
    }

    const textX = containerX + 40;
    const textMaxWidth = containerWidth - 80;
    let textY = containerY + 120;

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 42px Cobbler";
    ctx.textAlign = "left";

    function wrapText(text, x, y, maxWidth, lineHeight) {
        const words = text.split(" ");
        let line = "";
        const lines = [];

        for (let i = 0; i < words.length; i++) {
            const testLine = line + words[i] + " ";
            const metrics = ctx.measureText(testLine);
            const testWidth = metrics.width;

            if (testWidth > maxWidth && i > 0) {
                lines.push(line);
                line = words[i] + " ";
            } else {
                line = testLine;
            }
        }
        lines.push(line);

        for (let i = 0; i < lines.length; i++) {
            if (y + i * lineHeight < containerY + containerHeight - 80) {
                ctx.fillText(lines[i].trim(), x, y + i * lineHeight);
            }
        }

        return lines.length;
    }

    const titleLineHeight = 55;
    const lineCount = wrapText(title, textX, textY, textMaxWidth, titleLineHeight);

    textY += lineCount * titleLineHeight + 30;

    ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
    ctx.font = "32px Cobbler";

    const artistLineHeight = 40;
    wrapText(artist, textX, textY, textMaxWidth, artistLineHeight);

    const accentHeight = 120;
    const accentWidth = 6;
    const accentX = containerX - 20;
    const accentY = containerY + (containerHeight - accentHeight) / 2;

    const accentGradient = ctx.createLinearGradient(
        accentX,
        accentY,
        accentX,
        accentY + accentHeight
    );
    accentGradient.addColorStop(0, "#FF0000");
    accentGradient.addColorStop(0.5, "#CC0000");
    accentGradient.addColorStop(1, "#FF0000");

    ctx.save();
    ctx.shadowColor = "rgba(255, 0, 0, 0.4)";
    ctx.shadowBlur = 15;
    ctx.fillStyle = accentGradient;
    ctx.fillRect(accentX, accentY, accentWidth, accentHeight);
    ctx.restore();

    const dotRadius = 4;
    const dotSpacing = 12;
    const dotY = containerY + containerHeight - 30;

    ctx.fillStyle = "rgba(255, 255, 255, 0.2)";
    for (let i = 0; i < 5; i++) {
        ctx.beginPath();
        ctx.arc(
            containerX + containerWidth / 2 - 2 * dotSpacing + i * dotSpacing,
            dotY,
            dotRadius,
            0,
            Math.PI * 2
        );
        ctx.fill();
    }

    return canvas.toBuffer("image/png");
}
