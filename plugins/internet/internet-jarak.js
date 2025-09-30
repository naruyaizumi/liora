let handler = async (m, { conn, text, usedPrefix, command }) => {
    if (!text) {
        return m.reply(`🗺️ *Contoh: ${usedPrefix + command} cilacap,tasikmalaya*`);
    }

    let [from, to] = text.split(",").map((v) => v.trim());
    if (!from || !to) {
        return m.reply(`🗺️ *Contoh: ${usedPrefix + command} cilacap,tasikmalaya*`);
    }

    await global.loading(m, conn);

    try {
        const res = await fetch(global.API("btz", "/api/search/jarak", { from, to }, "apikey"));
        const json = await res.json();

        if (!json?.message) {
            throw new Error("Response kosong atau tidak valid");
        }

        const data = json.message;

        await conn.sendMessage(
            m.chat,
            {
                location: {
                    degreesLatitude: data.asal.koordinat.lat,
                    degreesLongitude: data.asal.koordinat.lon,
                },
            },
            { quoted: m }
        );

        const arahs = data.arah_penunjuk_jalan
            .map((v) => `*#${v.langkah}. ${v.instruksi} (${v.jarak})*`)
            .join("\n");

        await conn.sendFile(
            m.chat,
            data.peta_statis,
            "map.jpg",
            `
🌍 *Perjalanan dari ${data.asal.nama} ke ${data.tujuan.nama}*
────────────────────────
📍 *Asal: ${data.asal.alamat}*
🌐 *Negara: ${data.asal.negara} (${data.asal.kode_negara})*

🎯 *Tujuan: ${data.tujuan.alamat}*
🌐 *Negara: ${data.tujuan.negara} (${data.tujuan.kode_negara})*

📏 *Detail: ${data.detail}*
⛽ *BBM: ${data.estimasi_biaya_bbm.total_liter} L — ${data.estimasi_biaya_bbm.total_biaya}*

🧭 *Rute OpenStreetMap: ${data.rute}*
────────────────────────
🧾 *Arahan Jalur:*
${arahs}
      `.trim(),
            m
        );
    } catch (e) {
        console.error(e);
        m.reply(`⛔ *Gagal ambil data jarak:*\n${e.message}`);
    } finally {
        await global.loading(m, conn, true);
    }
};

handler.help = ["jarak"];
handler.tags = ["internet"];
handler.command = /^(jarak|peta)$/i;

export default handler;
