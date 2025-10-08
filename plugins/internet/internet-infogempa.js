import { fetch } from "../../src/bridge.js";

let handler = async (m, { conn }) => {
    await global.loading(m, conn);
    try {
        const res = await fetch("https://data.bmkg.go.id/DataMKG/TEWS/autogempa.json");
        if (!res.ok) throw new Error("Failed to fetch data from BMKG");
        const json = await res.json();
        const data = json.Infogempa.gempa;

        const timestamp = new Date().toTimeString().split(" ")[0];
        const mmi = data.Dirasakan ? `${data.Dirasakan} MMI Scale` : "No data available";

        const teks = [
            "```",
            `┌─[${timestamp}]────────────`,
            `│  EARTHQUAKE REPORT (BMKG)`,
            "└──────────────────────",
            `Date        : ${data.Tanggal}`,
            `Local Time  : ${data.Jam} WIB`,
            `UTC Time    : ${data.DateTime}`,
            `Location    : ${data.Wilayah}`,
            `Coordinates : ${data.Coordinates}`,
            `Magnitude   : ${data.Magnitude}`,
            `Depth       : ${data.Kedalaman}`,
            `Potential   : ${data.Potensi}`,
            "───────────────────────",
            `Felt Intensity : ${mmi}`,
            "───────────────────────",
            "Source : BMKG (Meteorology, Climatology and Geophysics Agency)",
            "```",
        ].join("\n");

        await conn.sendFile(
            m.chat,
            `https://data.bmkg.go.id/DataMKG/TEWS/${data.Shakemap}`,
            "shakemap.jpg",
            teks,
            m
        );
    } catch (e) {
        console.error(e);
        await m.reply(`Error: ${e.message}`);
    } finally {
        await global.loading(m, conn, true);
    }
};

handler.help = ["earthquake"];
handler.tags = ["internet"];
handler.command = /^(earthquake)$/i;

export default handler;