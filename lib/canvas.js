import { createCanvas, loadImage, registerFont } from "canvas";

export async function bannerCanvas(options = {}) {
  const cfg = {
    font: { name: options?.font?.name ?? "Poppins", path: options?.font?.path },
    avatar: options?.avatar ?? "https://cdn.discordapp.com/embed/avatars/0.png",
    background: options?.background ?? { type: "color", background: "#23272a" },
    title: options?.title ?? { data: "Welcome", color: "#fff", size: 36 },
    description:
      options?.description ?? {
        data: "Welcome to this server, go read the rules please!",
        color: "#a7b9c5",
        size: 26,
      },
    overlay_opacity: typeof options?.overlay_opacity === "number" ? options.overlay_opacity : 0,
    border: options?.border,
    avatar_border: options?.avatar_border ?? "#2a2e35",
  };

  if (cfg.font?.path) {
    try {
      registerFont(cfg.font.path, { family: cfg.font.name });
    } catch {
      // ignore
    }
  }

  const canvas = createCanvas(700, 350);
  const ctx = canvas.getContext("2d");

  if (cfg.border) {
    ctx.beginPath();
    ctx.lineWidth = 8;
    ctx.strokeStyle = cfg.border;
    ctx.moveTo(55, 15);
    ctx.lineTo(canvas.width - 55, 15);
    ctx.quadraticCurveTo(canvas.width - 20, 20, canvas.width - 15, 55);
    ctx.lineTo(canvas.width - 15, canvas.height - 55);
    ctx.quadraticCurveTo(
      canvas.width - 20,
      canvas.height - 20,
      canvas.width - 55,
      canvas.height - 15
    );
    ctx.lineTo(55, canvas.height - 15);
    ctx.quadraticCurveTo(20, canvas.height - 20, 15, canvas.height - 55);
    ctx.lineTo(15, 55);
    ctx.quadraticCurveTo(20, 20, 55, 15);
    ctx.lineTo(56, 15);
    ctx.stroke();
    ctx.closePath();
  }

  ctx.beginPath();
  ctx.moveTo(65, 25);
  ctx.lineTo(canvas.width - 65, 25);
  ctx.quadraticCurveTo(canvas.width - 25, 25, canvas.width - 25, 65);
  ctx.lineTo(canvas.width - 25, canvas.height - 65);
  ctx.quadraticCurveTo(canvas.width - 25, canvas.height - 25, canvas.width - 65, canvas.height - 25);
  ctx.lineTo(65, canvas.height - 25);
  ctx.quadraticCurveTo(25, canvas.height - 25, 25, canvas.height - 65);
  ctx.lineTo(25, 65);
  ctx.quadraticCurveTo(25, 25, 65, 25);
  ctx.lineTo(66, 25);
  ctx.closePath();
  ctx.clip();

  if (cfg.background?.type === "color") {
    ctx.fillStyle = cfg.background.background || "#23272a";
    ctx.fillRect(10, 10, canvas.width - 20, canvas.height - 20);
  } else if (cfg.background?.type === "image") {
    try {
      const bg = await loadImage(cfg.background.background);
      ctx.drawImage(bg, 10, 10, canvas.width - 20, canvas.height - 20);
    } catch {
      ctx.fillStyle = "#23272a";
      ctx.fillRect(10, 10, canvas.width - 20, canvas.height - 20);
    }
  }

  if (cfg.overlay_opacity > 0) {
    ctx.beginPath();
    ctx.globalAlpha = Math.max(0, Math.min(1, cfg.overlay_opacity));
    ctx.fillStyle = "#000";
    ctx.moveTo(75, 45);
    ctx.lineTo(canvas.width - 75, 45);
    ctx.quadraticCurveTo(canvas.width - 45, 45, canvas.width - 45, 75);
    ctx.lineTo(canvas.width - 45, canvas.height - 75);
    ctx.quadraticCurveTo(canvas.width - 45, canvas.height - 45, canvas.width - 75, canvas.height - 45);
    ctx.lineTo(75, canvas.height - 45);
    ctx.quadraticCurveTo(45, canvas.height - 45, 45, canvas.height - 75);
    ctx.lineTo(45, 75);
    ctx.quadraticCurveTo(45, 45, 75, 45);
    ctx.fill();
    ctx.closePath();
    ctx.globalAlpha = 1;
  }

  ctx.font = `bold ${cfg.title.size}px ${cfg.font.name}`;
  ctx.fillStyle = cfg.title.color;
  ctx.textAlign = "center";
  ctx.fillText(cfg.title.data, canvas.width / 2, 225);

  ctx.font = `regular ${cfg.description.size}px ${cfg.font.name}`;
  ctx.fillStyle = cfg.description.color;

  const desc = cfg.description.data ?? "";
  if (desc.length > 35) {
    const [line1, line2] = splitTwoLines(desc, 35);
    ctx.fillText(line1, canvas.width / 2, 260);
    ctx.fillText(line2, canvas.width / 2, 295);
  } else {
    ctx.fillText(desc, canvas.width / 2, 260);
  }

  ctx.beginPath();
  ctx.lineWidth = 5;
  ctx.strokeStyle = cfg.avatar_border;
  ctx.arc(canvas.width / 2, 125, 66, 0, Math.PI * 2);
  ctx.stroke();
  ctx.closePath();
  ctx.beginPath();
  ctx.arc(canvas.width / 2, 125, 60, 0, Math.PI * 2);
  ctx.closePath();
  ctx.clip();
  try {
    const av = await loadImage(cfg.avatar);
    ctx.drawImage(av, canvas.width / 2 - 60, 65, 120, 120);
  } catch {
    // ignore
  }

  return canvas.toBuffer("image/png");
}

function splitTwoLines(str, max = 35) {
  const words = str.split(" ");
  const left = [];
  const right = [];

  while (words.join(" ").length > max && words.length) {
    right.unshift(words.pop());
  }
  left.push(...words);
  return [left.join(" "), right.join(" ")];
}