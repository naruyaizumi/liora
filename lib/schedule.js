/* global conn */
import fs from "fs";
import path from "path";
import os from "os";

function resetCommand() {
    let user = global.db.data.users;
    for (let id in user) {
        let u = user[id];
        if (u && typeof u === "object") {
            u.command = 0;
            u.commandLimit = 1000;
            u.cmdLimitMsg = 0;
        }
    }
}

async function checkGempa() {
    let chat = global.db.data.chats;
    let bot = global.db.data.bots;
    let res = await fetch("https://data.bmkg.go.id/DataMKG/TEWS/autogempa.json");
    let json = await res.json();
    let gempa = json.Infogempa.gempa;
    if (gempa.DateTime !== bot.gempaDateTime) {
        bot.gempaDateTime = gempa.DateTime;
        let groups = Object.entries(conn.chats)
            .filter(
                ([jid, chat]) =>
                    jid.endsWith("@g.us") &&
                    chat.isChats &&
                    !chat.metadata?.read_only &&
                    !chat.metadata?.announce &&
                    !chat.isCommunity &&
                    !chat.isCommunityAnnounce &&
                    !chat?.metadata?.isCommunity &&
                    !chat?.metadata?.isCommunityAnnounce
            )
            .map((v) => v[0]);
        for (let number of groups) {
            if (chat[number].notifgempa && gempa.DateTime !== chat[number].gempaDateTime) {
                chat[number].gempaDateTime = gempa.DateTime;
                let mmiInfo = gempa.Dirasakan
                    ? `📍 *Wilayah yang Merasakan : ${gempa.Dirasakan} Skala MMI*`
                    : `📍 *Wilayah yang Merasakan : Tidak ada data*`;
                let caption = `
🍥 *Informasi Gempa Terkini - BMKG* 🍥
━━━━━━━━━━━━━━━━━━━
📅 *Tanggal : ${gempa.Tanggal}*
🕒 *Waktu : ${gempa.Jam} WIB*
🕒 *Waktu : ${gempa.DateTime} UTC*
📍 *Lokasi : ${gempa.Wilayah}*
🌐 *Koordinat : ${gempa.Coordinates} Latitude, Longitude*
💪 *Magnitudo : ${gempa.Magnitude}*
📏 *Kedalaman : ${gempa.Kedalaman}*
⚠️ *Potensi : ${gempa.Potensi}*
━━━━━━━━━━━━━━━━━━━
${mmiInfo}
🗺️ *Peta Guncangan Shakemap : Terlampir di atas.*
━━━━━━━━━━━━━━━━━━━
📢 *Sumber Data :*
*_Data ini berasal dari BMKG (Badan Meteorologi, Klimatologi, dan Geofisika)_*
`.trim();
                await conn.sendFile(
                    number,
                    "https://data.bmkg.go.id/DataMKG/TEWS/" + gempa.Shakemap,
                    "shakemap.jpg",
                    caption,
                    false
                );
            }
        }
    }
}

function clearTmp() {
    let __dirname = global.__dirname(import.meta.url);
    let tmp = [os.tmpdir(), path.join(__dirname, "../tmp")];
    tmp.forEach((dirname) => {
        if (!fs.existsSync(dirname)) {
            fs.mkdirSync(dirname, { recursive: true });
        }
    });
    let filenames = [];
    tmp.forEach((dirname) => {
        try {
            fs.readdirSync(dirname).forEach((file) => filenames.push(path.join(dirname, file)));
        } catch {
            // ignore
        }
    });
    filenames.forEach((file) => {
        try {
            let stats = fs.statSync(file);
            if (stats.isFile() && Date.now() - stats.mtimeMs >= 1000 * 60 * 5) {
                fs.unlinkSync(file);
            }
        } catch {
            // ignore
        }
    });
}

export { resetCommand, checkGempa, clearTmp };
