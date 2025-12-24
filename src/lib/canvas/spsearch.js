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
    ctx.shadowColor = "rgba(0, 0, 0, 0.5)";
    ctx.shadowBlur = 20;
    ctx.shadowOffsetY = 8;
    roundRect(ctx, x, y, w, h, r);

    ctx.fillStyle = "#181818";
    ctx.fill();

    ctx.restore();
}

function drawSearchBar(ctx, x, y, w, h, query) {
    ctx.save();

    roundRect(ctx, x, y, w, h, 500);

    ctx.fillStyle = "#FFFFFF";
    ctx.fill();

    ctx.strokeStyle = "#000000";
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(x + 28, y + h / 2, 9, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x + 35, y + h / 2 + 6);
    ctx.lineTo(x + 40, y + h / 2 + 11);
    ctx.stroke();

    ctx.fillStyle = "#000000";
    ctx.font = "22px Cobbler";
    ctx.textAlign = "left";
    ctx.fillText(query, x + 55, y + h / 2 + 7);

    ctx.restore();
}

function drawStatsCard(ctx, x, y, w, h, title, value) {
    ctx.save();

    roundRect(ctx, x, y, w, h, 8);
    ctx.fillStyle = "#181818";
    ctx.fill();

    ctx.fillStyle = "#B3B3B3";
    ctx.font = "14px Cobbler";
    ctx.textAlign = "left";
    ctx.fillText(title, x + 20, y + 35);

    ctx.fillStyle = "#FFFFFF";
    ctx.font = "bold 36px Cobbler";
    ctx.fillText(value, x + 20, y + 80);

    ctx.restore();
}

function parseDuration(duration) {
    if (!duration) return 0;
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

function drawInfoBadge(ctx, x, y, text) {
    ctx.save();

    const padding = 12;
    const height = 32;
    const textWidth = ctx.measureText(text).width;
    const width = textWidth + padding * 2;

    roundRect(ctx, x, y, width, height, 16);
    ctx.fillStyle = "rgba(255, 255, 255, 0.1)";
    ctx.fill();

    ctx.fillStyle = "#FFFFFF";
    ctx.font = "bold 14px Cobbler";
    ctx.textAlign = "center";
    ctx.fillText(text, x + width / 2, y + height / 2 + 4);

    ctx.restore();

    return width;
}

export async function canvas(tracks, query) {
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
    bgGradient.addColorStop(0, "#121212");
    bgGradient.addColorStop(1, "#000000");
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, BASE_WIDTH, BASE_HEIGHT);

    const displayTracks = tracks.slice(0, 9);
    const covers = await Promise.all(
        displayTracks.map(async (track) => {
            try {
                return await loadImage(track.cover);
            } catch {
                return null;
            }
        })
    );

    const spotifyLogo = await loadImage(
        "https://storage.googleapis.com/pr-newsroom-wp/1/2018/11/Spotify_Logo_RGB_Green.png"
    );

    const padding = 50;

    ctx.fillStyle = "#000000";
    ctx.fillRect(0, 0, BASE_WIDTH, 160);

    ctx.save();
    const logoW = 150;
    const logoH = 45;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(spotifyLogo, padding, 35, logoW, logoH);
    ctx.restore();

    const searchBarY = 45;
    const searchBarW = 500;
    const searchBarH = 45;
    drawSearchBar(ctx, padding + 200, searchBarY, searchBarW, searchBarH, query);

    const badgeY = 50;
    let badgeX = BASE_WIDTH - padding;

    ctx.font = "bold 14px Cobbler";

    const totalTracks = tracks.length;
    const w1 = drawInfoBadge(ctx, badgeX - 110, badgeY, `${totalTracks} tracks`);
    badgeX -= w1 + 10;

    const totalArtists = new Set(tracks.slice(0, 20).map((t) => t.artist)).size;
    drawInfoBadge(ctx, badgeX - 120, badgeY, `${totalArtists} artists`);

    const statsY = 180;
    const cardW = (BASE_WIDTH - padding * 2 - 60) / 4;
    const cardH = 110;
    const cardGap = 20;

    const totalDuration = tracks
        .slice(0, 20)
        .reduce((sum, t) => sum + parseDuration(t.duration), 0);
    const avgDuration = Math.floor(totalDuration / Math.min(tracks.length, 20));
    const totalPlaytime = tracks
        .slice(0, 20)
        .reduce((sum, t) => sum + parseDuration(t.duration), 0);

    const statsCards = [
        {
            title: "TOTAL TRACKS",
            value: tracks.length.toString(),
        },
        {
            title: "AVG DURATION",
            value: formatDuration(avgDuration),
        },
        {
            title: "TOTAL PLAYTIME",
            value: formatDuration(totalPlaytime),
        },
        {
            title: "ARTISTS",
            value: new Set(tracks.slice(0, 20).map((t) => t.artist)).size.toString(),
        },
    ];

    statsCards.forEach((card, i) => {
        const cardX = padding + i * (cardW + cardGap);
        drawStatsCard(ctx, cardX, statsY, cardW, cardH, card.title, card.value);
    });

    const albumY = statsY + cardH + 40;
    const trackCardW = (BASE_WIDTH - padding * 2 - 40) / 3;
    const trackCardH = 320;
    const trackGap = 20;
    const cols = 3;

    for (let i = 0; i < displayTracks.length && i < 9; i++) {
        const col = i % cols;
        const row = Math.floor(i / cols);
        const x = padding + col * (trackCardW + trackGap);
        const y = albumY + row * (trackCardH + trackGap);

        drawCard(ctx, x, y, trackCardW, trackCardH, 12);

        if (covers[i]) {
            const coverSize = 190;
            const img = covers[i];

            ctx.save();
            roundRect(ctx, x + 15, y + 15, trackCardW - 30, coverSize, 8);
            ctx.clip();

            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = "high";

            const scale = Math.max((trackCardW - 30) / img.width, coverSize / img.height);
            const sw = (trackCardW - 30) / scale;
            const sh = coverSize / scale;
            const sx = (img.width - sw) / 2;
            const sy = (img.height - sh) / 2;

            ctx.drawImage(img, sx, sy, sw, sh, x + 15, y + 15, trackCardW - 30, coverSize);

            const overlayGrad = ctx.createLinearGradient(
                x + 15,
                y + 15 + coverSize - 60,
                x + 15,
                y + 15 + coverSize
            );
            overlayGrad.addColorStop(0, "rgba(0, 0, 0, 0)");
            overlayGrad.addColorStop(1, "rgba(0, 0, 0, 0.9)");
            ctx.fillStyle = overlayGrad;
            ctx.fillRect(x + 15, y + 15, trackCardW - 30, coverSize);

            ctx.restore();

            const track = displayTracks[i];
            if (track.duration) {
                const badgeW = 60;
                const badgeH = 26;
                const badgeX = x + trackCardW - 30 - badgeW - 8;
                const badgeY = y + 15 + coverSize - badgeH - 8;

                ctx.fillStyle = "rgba(0, 0, 0, 0.8)";
                roundRect(ctx, badgeX, badgeY, badgeW, badgeH, 4);
                ctx.fill();

                ctx.fillStyle = "#FFFFFF";
                ctx.font = "bold 13px Cobbler";
                ctx.textAlign = "center";
                ctx.fillText(track.duration, badgeX + badgeW / 2, badgeY + badgeH / 2 + 4);
            }
        }

        const track = displayTracks[i];
        const infoY = y + 225;

        ctx.fillStyle = "#FFFFFF";
        ctx.font = "bold 18px Cobbler";
        ctx.textAlign = "left";

        let title = track.title;
        const maxTitleW = trackCardW - 40;
        let measuredWidth = ctx.measureText(title).width;

        if (measuredWidth > maxTitleW) {
            let truncated = title;
            while (ctx.measureText(truncated + "...").width > maxTitleW && truncated.length > 0) {
                truncated = truncated.slice(0, -1);
            }
            title = truncated + "...";
        }

        ctx.fillText(title, x + 20, infoY);

        ctx.fillStyle = "#B3B3B3";
        ctx.font = "bold 16px Cobbler";
        ctx.fillText(track.artist, x + 20, infoY + 32);

        ctx.fillStyle = "#B3B3B3";
        ctx.font = "12px Cobbler";
        ctx.fillText(`#${i + 1}`, x + 20, infoY + 62);

        ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x + 20, infoY + 78);
        ctx.lineTo(x + trackCardW - 20, infoY + 78);
        ctx.stroke();
    }

    const footerY = BASE_HEIGHT - 70;

    ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
    ctx.fillRect(0, footerY, BASE_WIDTH, 70);

    ctx.fillStyle = "#B3B3B3";
    ctx.font = "14px Cobbler";
    ctx.textAlign = "center";
    ctx.fillText(
        `Generated ${new Date().toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
        })}`,
        BASE_WIDTH / 2,
        footerY + 30
    );

    ctx.fillStyle = "#808080";
    ctx.font = "12px Cobbler";
    ctx.fillText(`${tracks.length} tracks • ${totalArtists} artists`, BASE_WIDTH / 2, footerY + 50);

    return canvas.toBuffer("image/png", {
        compressionLevel: 0,
        filters: canvas.PNG_ALL_FILTERS,
    });
}
