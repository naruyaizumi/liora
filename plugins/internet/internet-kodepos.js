let handler = async (m, { conn, usedPrefix, command, text }) => {
    if (!text)
        return m.reply(
            `📌 *Masukkan nama daerah yang ingin dicari kode posnya!*\n\n📝 *Contoh: ${usedPrefix + command} jakarta*`
        );
    await global.loading(m, conn);
    let response = await fetch(global.API("btz", "/api/search/kodepos", { query: text }, "apikey"));
    let data = await response.json();
    if (data.status !== 200 || !data.result.length)
        return m.reply(
            "❌ *Kode pos tidak ditemukan! Coba cari dengan kata kunci yang lebih spesifik.*"
        );
    let firstLocation = data.result[0];
    let allResults = data.result
        .map(
            (loc, i) =>
                `📍 *${i + 1}. ${loc.village}, ${loc.district}*\n🏙️ *${loc.regency}, ${loc.province}*\n📮 *Kode Pos: ${loc.postalCode}*`
        )
        .join("\n\n");
    await conn.sendMessage(
        m.chat,
        {
            location: {
                degreesLatitude: firstLocation.latitude,
                degreesLongitude: firstLocation.longitude,
            },
        },
        { quoted: m }
    );
    await conn.sendMessage(
        m.chat,
        {
            text: `
📍 *Hasil Pencarian Kode Pos untuk ${text}*
━━━━━━━━━━━━━━━━━━━
🏠 *Desa/Kelurahan: ${firstLocation.village}*
🏢 *Kecamatan: ${firstLocation.district}*
🏙️ *Kabupaten/Kota: ${firstLocation.regency}*
🌍 *Provinsi: ${firstLocation.province}*
📮 *Kode Pos: ${firstLocation.postalCode}*
🕰️ *Zona Waktu: ${firstLocation.timezone}*
━━━━━━━━━━━━━━━━━━━
📜 *Kode Pos Lainnya:*
${allResults}
━━━━━━━━━━━━━━━━━━━
📌 *Gunakan informasi ini sesuai kebutuhan Anda!*
`.trim(),
            contextInfo: {
                externalAdReply: {
                    title: "📮 Hasil Pencarian Kode Pos",
                    body: `📌 ${text} - ${firstLocation.regency}, ${firstLocation.province}`,
                    thumbnailUrl: "https://qu.ax/CdKZv.jpg",
                    mediaType: 1,
                    renderLargerThumbnail: true,
                },
            },
        },
        { quoted: m }
    );
    await global.loading(m, conn, true);
};

handler.help = ["kodepos"];
handler.tags = ["internet"];
handler.command = /^(kodepos|pos)$/i;

export default handler;
