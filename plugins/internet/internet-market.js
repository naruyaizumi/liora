import { createCanvas, loadImage } from "canvas";

let handler = async (m, { args, usedPrefix, command, conn }) => {
    if (!args[0]) return m.reply(`Example: ${usedPrefix}${command} btc`);
    let coin = args[0].toLowerCase();
    let pairKey = `${coin}idr`;
    let [res1, res2] = await Promise.all([
        fetch("https://indodax.com/api/summaries"),
        fetch("https://indodax.com/api/pairs"),
    ]);
    let summaries = await res1.json();
    let pairs = await res2.json();
    let info = pairs.find((p) => p.symbol.toLowerCase() === pairKey);
    if (!info) return m.reply(`Pair ${pairKey.toUpperCase()} not found.`);
    let ticker = summaries.tickers[`${coin}_idr`];
    if (!ticker) return m.reply(`Ticker data for ${coin} not found.`);

    let canvas = createCanvas(800, 560);
    let ctx = canvas.getContext("2d");
    let bg = await loadImage("https://files.catbox.moe/yvyl8p.jpg");
    ctx.drawImage(bg, 0, 0, canvas.width, canvas.height);
    ctx.shadowBlur = 0;
    ctx.fillStyle = "rgba(20,30,40,0.65)";
    ctx.beginPath();
    ctx.roundRect(20, 20, 760, 520, 28);
    ctx.fill();

    ctx.shadowBlur = 0;
    ctx.fillStyle = "#00e0ff";
    ctx.font = "bold 28px sans-serif";
    ctx.fillText(info.description, 40, 60);

    try {
        let logo = await loadImage(info.url_logo_png);
        ctx.drawImage(logo, canvas.width - 100, 20, 48, 48);
    } catch {
        /* Davina Karamoy */
    }

    let drawItem = (x, y, label, value) => {
        ctx.fillStyle = "rgba(255,255,255,0.12)";
        ctx.beginPath();
        ctx.roundRect(x, y, 320, 52, 14);
        ctx.fill();
        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 16px sans-serif";
        ctx.fillText(label, x + 16, y + 22);
        ctx.fillStyle = "#ffffff";
        ctx.font = "20px sans-serif";
        ctx.fillText(value, x + 16, y + 45);
    };

    let dataLeft = [
        ["Pair", info.symbol],
        ["Base", info.base_currency.toUpperCase()],
        ["Traded", info.traded_currency_unit],
        ["Min Trade", `${info.trade_min_traded_currency} ${info.traded_currency_unit}`],
        ["Min IDR", `Rp ${Number(info.trade_min_base_currency).toLocaleString("id-ID")}`],
    ];

    let dataRight = [
        ["Maker Fee", `${info.trade_fee_percent_maker}%`],
        ["Taker Fee", `${info.trade_fee_percent_taker}%`],
        ["Buy Price", `Rp ${Number(ticker.buy).toLocaleString("id-ID")}`],
        ["Sell Price", `Rp ${Number(ticker.sell).toLocaleString("id-ID")}`],
        ["Last Price", `Rp ${Number(ticker.last).toLocaleString("id-ID")}`],
    ];

    for (let i = 0; i < dataLeft.length; i++) {
        drawItem(40, 100 + i * 60, dataLeft[i][0], dataLeft[i][1]);
    }
    for (let i = 0; i < dataRight.length; i++) {
        drawItem(420, 100 + i * 60, dataRight[i][0], dataRight[i][1]);
    }

    let drawSummaryBox = (x, y, label, value) => {
        ctx.fillStyle = "rgba(255,255,255,0.05)";
        ctx.beginPath();
        ctx.roundRect(x, y, 320, 52, 12);
        ctx.fill();
        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 15px sans-serif";
        ctx.fillText(label, x + 14, y + 22);
        ctx.fillStyle = "#00e0ff";
        ctx.font = "20px sans-serif";
        ctx.fillText(`Rp ${Number(value).toLocaleString("id-ID")}`, x + 14, y + 45);
    };

    let prices24h = summaries.prices_24h[pairKey];
    let prices7d = summaries.prices_7d[pairKey];
    drawSummaryBox(40, 430, "Last 24 Hours Price", prices24h || "-");
    drawSummaryBox(420, 430, "Last 7 Days Price", prices7d || "-");

    let title = `Market Info ${info.description}`;
    let prediksi = `Market Analysis & Forecast\n`;
    prediksi += `Currently, ${info.traded_currency_unit} is priced at Rp ${Number(ticker.last).toLocaleString("id-ID")}.\n`;
    prediksi += `High: Rp ${Number(ticker.high).toLocaleString("id-ID")}\nLow: Rp ${Number(ticker.low).toLocaleString("id-ID")}\n`;

    let diff = Number(ticker.last) - Number(prices24h);
    if (!isNaN(diff)) {
        let persentase = ((diff / prices24h) * 100).toFixed(2);
        let arah = diff > 0 ? "increased" : "decreased";
        prediksi += `Price has ${arah} by approximately ${Math.abs(persentase)}% compared to the last 24 hours.\n`;
    } else {
        prediksi += `Comparison with the last 24 hours is unavailable.\n`;
    }

    prediksi += `Volume: ${Number(ticker.vol_btc).toFixed(2)} ${info.traded_currency_unit}\n`;
    prediksi +=
        Number(ticker.vol_btc) > 50
            ? `High market activity — ideal for active traders.\n`
            : `Calm market conditions — safer entry opportunities.\n`;

    await conn.sendMessage(
        m.chat,
        {
            image: canvas.toBuffer(),
            caption: `${title}\n${prediksi}`,
        },
        { quoted: m }
    );
};

handler.help = ["market"];
handler.tags = ["internet"];
handler.command = /^(market|stock)$/i;

export default handler;
