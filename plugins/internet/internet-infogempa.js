let handler = async (m, { conn }) => {
    await global.loading(m, conn);
    try {
        let res = await (await fetch("https://data.bmkg.go.id/DataMKG/TEWS/autogempa.json")).json();
        let data = res.Infogempa.gempa;
        let mmiInfo = data.Dirasakan
            ? `📍 *Wilayah yang Merasakan : ${data.Dirasakan} Skala MMI*`
            : `📍 *Wilayah yang Merasakan : Tidak ada data*`;
        let teks = `🍓 *Info Gempa Terkini - BMKG* 🍓
━━━━━━━━━━━━━━━━━━━
📅 *Tanggal : ${data.Tanggal}*
🕒 *Waktu : ${data.Jam} WIB*
🕒 *UTC : ${data.DateTime}*
📍 *Lokasi : ${data.Wilayah}*
🌐 *Koordinat : ${data.Coordinates}*
💥 *Magnitudo : ${data.Magnitude}*
📏 *Kedalaman : ${data.Kedalaman}*
⚠️ *Potensi : ${data.Potensi}*
━━━━━━━━━━━━━━━━━━━
${mmiInfo}
🗺️ *Shakemap : Terlampir di atas*
━━━━━━━━━━━━━━━━━━━
🍰 *Sumber: BMKG (Badan Meteorologi, Klimatologi, dan Geofisika)*
`.trim();
        await conn.sendFile(
            m.chat,
            "https://data.bmkg.go.id/DataMKG/TEWS/" + data.Shakemap,
            "map.jpg",
            teks,
            m
        );
    } finally {
        await global.loading(m, conn, true);
    }
};

handler.help = ["infogempa"];
handler.tags = ["internet"];
handler.command = /^(infogempa)$/i;

export default handler;
