/* global conn */
import fs from "fs/promises";
import path from "path";
import os from "os";
import { fetch } from "../src/bridge.js";

async function checkGempa() {
    try {
        const chat = global.db.data.chats;
        const res = await fetch("https://data.bmkg.go.id/DataMKG/TEWS/autogempa.json");
        if (!res.ok) throw new Error("Gagal mengambil data dari BMKG");

        const json = await res.json();
        const gempa = json?.Infogempa?.gempa;
        if (!gempa || !gempa.DateTime) return;

        if (gempa.DateTime !== chat.gempaDateTime) {
            chat.gempaDateTime = gempa.DateTime;
            const groups = Object.entries(conn.chats)
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
                .map(([jid]) => jid);

            for (const number of groups) {
                if (chat[number]?.notifgempa && gempa.DateTime !== chat[number].gempaDateTime) {
                    chat[number].gempaDateTime = gempa.DateTime;

                    const mmiInfo = gempa.Dirasakan
                        ? `📍 *Wilayah yang Merasakan : ${gempa.Dirasakan} Skala MMI*`
                        : `📍 *Wilayah yang Merasakan : Tidak ada data*`;

                    const caption = `
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

                    await conn.sendMessage(number, {
                        image: { url: "https://data.bmkg.go.id/DataMKG/TEWS/" + gempa.Shakemap },
                        caption,
                    });
                }
            }
        }
    } catch {
        /* ignore */
    }
}

async function clearTmp() {
    const __dirname = global.__dirname(import.meta.url);
    const tmpDirs = [os.tmpdir(), path.join(__dirname, "../tmp")];

    for (const dir of tmpDirs) {
        try {
            await fs.mkdir(dir, { recursive: true });
        } catch {
            /* ignore */
        }
    }

    const filenames = [];
    for (const dir of tmpDirs) {
        try {
            const files = await fs.readdir(dir);
            for (const file of files) filenames.push(path.join(dir, file));
        } catch {
            /* ignore */
        }
    }

    const now = Date.now();
    for (const file of filenames) {
        try {
            const stats = await fs.stat(file);
            if (stats.isFile() && now - stats.mtimeMs >= 1000 * 60 * 5) {
                await fs.unlink(file);
            }
        } catch {
            /* ignore */
        }
    }
}

export { checkGempa, clearTmp };
