import { createCanvas, loadImage } from "canvas";

let handler = async (m, { conn, args }) => {
    if (!args[0]) return m.reply('🍭 *Masukkan nama desa/kelurahan, misalnya "Senen"*');
    let keyword = args.join(" ").toLowerCase();
    let keywords = keyword.split(",").map((k) => k.trim());
    let res = await fetch(
        "https://raw.githubusercontent.com/kodewilayah/permendagri-72-2019/main/dist/base.csv"
    );
    let csv = await res.text();
    let lines = csv
        .trim()
        .split("\n")
        .map((r) => r.split(","));
    let kodeNamaMap = Object.fromEntries(lines);
    let wilayahLengkap = lines
        .filter(([kode]) => kode.split(".").length === 4)
        .map(([kode, nama]) => {
            let parts = kode.split(".");
            let kecamatan = kodeNamaMap[parts.slice(0, 3).join(".")] || "";
            let kabupaten = kodeNamaMap[parts.slice(0, 2).join(".")] || "";
            let provinsi = kodeNamaMap[parts[0]] || "";
            let full = [nama, kecamatan, kabupaten, provinsi].filter(Boolean).join(", ");
            return [kode, full.toLowerCase()];
        });
    let [kode] =
        wilayahLengkap.find(([_, full]) => { // eslint-disable-line no-unused-vars
            return keywords.every((k) => full.includes(k));
        }) || [];
    if (!kode)
        return m.reply(
            '🍬 *Maaf, lokasi tidak ditemukan. Coba tulis lengkap, misalnya "Senen, Jakarta Pusat, DKI Jakarta"*'
        );
    let resCuaca = await fetch(`https://api.bmkg.go.id/publik/prakiraan-cuaca?adm4=${kode}`);
    let data = await resCuaca.json();
    let lokasi = data.lokasi;
    let cuaca = data.data[0].cuaca.flat().slice(0, 4);
    let canvas = createCanvas(960, 540);
    let ctx = canvas.getContext("2d");
    let bg = await loadImage("https://files.catbox.moe/7gi9d9.jpg");
    ctx.drawImage(bg, 0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
    ctx.beginPath();
    ctx.roundRect(30, 30, 900, 70, 20);
    ctx.fill();
    let logoBMKG = await loadImage(
        "https://upload.wikimedia.org/wikipedia/commons/e/e3/BMG_2003.png"
    );
    let logoWidth = 64;
    let logoHeight = logoBMKG.height * (logoWidth / logoBMKG.width);
    let offsetY = (70 - logoHeight) / 2;
    ctx.drawImage(logoBMKG, 50, 30 + offsetY, logoWidth, logoHeight);
    ctx.font = "bold 28px sans-serif";
    ctx.fillStyle = "#0a3d62";
    ctx.textAlign = "center";
    ctx.fillText("PRAKIRAAN CUACA BMKG", canvas.width / 2 + 20, 65);
    ctx.font = "18px sans-serif";
    ctx.fillStyle = "#2c3e50";
    ctx.fillText(
        `${lokasi.desa}, ${lokasi.kecamatan}, ${lokasi.provinsi}`,
        canvas.width / 2 + 20,
        90
    );
    ctx.textAlign = "start";
    ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
    ctx.beginPath();
    ctx.roundRect(30, 120, 900, 380, 25);
    ctx.fill();
    let panelWidth = 180;
    let panelCount = cuaca.length;
    let totalPanelWidth = panelCount * panelWidth;
    let paddingLeftRight = 60;
    let totalMarginSpace = canvas.width - totalPanelWidth - paddingLeftRight * 2;
    let panelMargin = panelCount > 1 ? totalMarginSpace / (panelCount - 1) : 0;
    for (let i = 0; i < cuaca.length; i++) {
        let x = paddingLeftRight + i * (panelWidth + panelMargin);
        let y = 150;
        let w = cuaca[i];
        ctx.fillStyle = "rgba(255,255,255,0.85)";
        ctx.shadowColor = "rgba(0,0,0,0.15)";
        ctx.shadowBlur = 6;
        ctx.beginPath();
        ctx.roundRect(x, y, panelWidth, 330, 20);
        ctx.fill();
        ctx.shadowBlur = 0;
        let icon = await loadImage(w.image);
        ctx.drawImage(icon, x + 30, y + 20, 100, 100);
        ctx.fillStyle = "#2c3e50";
        ctx.font = "bold 18px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(w.weather_desc, x + panelWidth / 2, y + 135);
        let drawBox = (emoji, text, posY) => {
            ctx.fillStyle = "rgba(255,255,255,0.95)";
            ctx.beginPath();
            ctx.roundRect(x + 10, posY, panelWidth - 20, 26, 8);
            ctx.fill();
            ctx.font = "16px sans-serif";
            ctx.fillStyle = "#34495e";
            ctx.textAlign = "left";
            ctx.fillText(`${emoji} ${text}`, x + 18, posY + 18);
        };
        drawBox("", `${w.t}°C`, y + 150);
        drawBox("", `${w.hu}% RH`, y + 180);
        drawBox("", `${w.ws} km/jam`, y + 210);
        drawBox("", w.wd, y + 240);
        drawBox("", w.vs_text, y + 270);
        drawBox("", w.local_datetime.split(" ")[1], y + 300);
    }
    let buffer = canvas.toBuffer("image/png");
    let caption = `📡 *Prakiraan Cuaca Wilayah*\n📍 *${lokasi.desa}, ${lokasi.kecamatan}, ${lokasi.provinsi}*\n🌤️ *Sumber: BMKG.go.id*`;
    conn.sendFile(m.chat, buffer, "cuaca.png", caption, m);
};

handler.help = ["cuaca"];
handler.tags = ["internet"];
handler.command = /^(cuaca)$/i;

export default handler;
