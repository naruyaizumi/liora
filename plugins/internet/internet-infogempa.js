let handler = async (m, { conn }) => {
    await global.loading(m, conn);
    try {
        const res = await fetch("https://data.bmkg.go.id/DataMKG/TEWS/autogempa.json");
        if (!res.ok) throw new Error("Failed to fetch data from BMKG");
        const json = await res.json();
        const data = json.Infogempa.gempa;

        const mmi = data.Dirasakan ? `${data.Dirasakan} MMI Scale` : "No data available";
        const text = `
Earthquake Report (BMKG)
────────────────────────────
Date: ${data.Tanggal}
Local Time: ${data.Jam} WIB
UTC Time: ${data.DateTime}
Location: ${data.Wilayah}
Coordinates: ${data.Coordinates}
Magnitude: ${data.Magnitude}
Depth: ${data.Kedalaman}
Potential: ${data.Potensi}
Felt Intensity: ${mmi}
────────────────────────────
Source: BMKG (Meteorology, Climatology and Geophysics Agency)
        `.trim();

        await conn.sendMessage(m.chat, {
            image: { url: `https://data.bmkg.go.id/DataMKG/TEWS/${data.Shakemap}` },
            caption: text,
        });
    } catch (e) {
        conn.logger.error(e);
        m.reply(`Error: ${e.message}`);
    } finally {
        await global.loading(m, conn, true);
    }
};

handler.help = ["earthquake"];
handler.tags = ["internet"];
handler.command = /^(earthquake)$/i;

export default handler;
