let handler = async (m, { conn, usedPrefix, command, text }) => {
    try {
        if (!text)
            return m.reply(
                `🍙 *Masukkan nama HP!*\n🍡 *Contoh: ${usedPrefix + command} samsung s25 ultra*`
            );
        await global.loading(m, conn);

        let response = await fetch(
            global.API("btz", "/api/webzone/gsmarena", { query: text }, "apikey")
        );
        if (!response.ok)
            throw new Error(`🍤 *Gagal mendapatkan data dari API. Status:* ${response.status}`);
        let json = await response.json();
        if (!json.status || !json.result) return m.reply("🍜 *HP tidak ditemukan!*");
        let data = json.result;
        let specs = data.specifications;
        let caption = `
🍙 *${data.name}*
🍣 *Detail GSMArena: ${data.url}*
━━━━━━━━━━━━━━━━━━━
🍡 *Jaringan: ${specs.network.technology || "Tidak tersedia"}*
🍢 *2G Bands: ${specs.network.bands2g || "Tidak tersedia"}*
🍤 *3G Bands: ${specs.network.bands3g || "Tidak tersedia"}*
🍥 *4G Bands: ${specs.network.bands4g || "Tidak tersedia"}*
🥟 *5G Bands: ${specs.network.bands5g || "Tidak tersedia"}*
🍜 *Kecepatan: ${specs.network.speed || "Tidak tersedia"}*

🍙 *Dimensi & Desain:*
🍛 *Dimensi: ${specs.body.dimensions || "Tidak tersedia"}*
🍚 *Berat: ${specs.body.weight || "Tidak tersedia"}*
🍝 *Material: ${specs.body.build || "Tidak tersedia"}*
🍱 *SIM: ${specs.body.sim || "Tidak tersedia"}*

🍣 *Layar:*
🥠 *Tipe: ${specs.display.type || "Tidak tersedia"}*
🍙 *Ukuran: ${specs.display.size || "Tidak tersedia"}*
🍢 *Resolusi: ${specs.display.resolution || "Tidak tersedia"}*
🍘 *Proteksi: ${specs.display.protection || "Tidak tersedia"}*

🍡 *Performa:*
🍤 *Chipset: ${specs.platform.chipset || "Tidak tersedia"}*
🍥 *CPU: ${specs.platform.cpu || "Tidak tersedia"}*
🍜 *GPU: ${specs.platform.gpu || "Tidak tersedia"}*
🥟 *OS: ${specs.platform.os || "Tidak tersedia"}*

🍙 *Memori:*
🍛 *Internal: ${specs.memory.internal || "Tidak tersedia"}*
🍚 *Slot Memori: ${specs.memory.cardSlot || "Tidak tersedia"}*

🍣 *Kamera Utama:*
🍡 *Resolusi: ${specs.mainCamera.single || specs.mainCamera.dual || "Tidak tersedia"}*
🍢 *Fitur: ${specs.mainCamera.features || "Tidak tersedia"}""
🍘 *Video: ${specs.mainCamera.video || "Tidak tersedia"}*

🍤 *Kamera Selfie:*
🥟 *Resolusi: ${specs.selfieCamera.single || "Tidak tersedia"}*
🍜 *Fitur: ${specs.selfieCamera.features || "Tidak tersedia"}*
🍥 *Video: ${specs.selfieCamera.video || "Tidak tersedia"}*

🍙 *Baterai:*
🍡 *Tipe: ${specs.battery.type || "Tidak tersedia"}*
🍛 *Pengisian Daya: ${specs.battery.charging || "Tidak tersedia"}*
🍚 *Rilis: ${specs.launch.status || "Tidak tersedia"}*

🍣 *Audio & Konektivitas*
🍢 *Loudspeaker: ${specs.sound.loudspeaker || "Tidak tersedia"}*
🍘 *Jack Audio: ${specs.sound.jack || "Tidak tersedia"}*
🍤 *Wi-Fi: ${specs.comms.wlan || "Tidak tersedia"}
🥟 *Bluetooth: ${specs.comms.bluetooth || "Tidak tersedia"}*
🍜 *GPS: ${specs.comms.positioning || "Tidak tersedia"}*
🍥 *Radio: ${specs.comms.radio || "Tidak tersedia"}*
🍙 *USB: ${specs.comms.usb || "Tidak tersedia"}*
🍡 *NFC: ${specs.comms.nfc || "Tidak tersedia"}*

🍱 *Warna: ${specs.colors ? specs.colors.join(", ") : "Tidak tersedia"}*
🍩 *Harga: ${specs.price || "Tidak tersedia"}*
`.trim();

        await conn.sendMessage(
            m.chat,
            {
                text: caption,
                contextInfo: {
                    externalAdReply: {
                        title: data.name,
                        body: "🍙 Klik untuk detail spesifikasi lengkap!",
                        thumbnailUrl: data.image,
                        mediaType: 1,
                        renderLargerThumbnail: true,
                        sourceUrl: data.url,
                    },
                },
            },
            { quoted: m }
        );
    } catch (error) {
        console.error(error);
        return m.reply(
            `🍩 *Terjadi kesalahan saat memproses permintaan.*\n🍜 *Detail:* ${error.message}`
        );
    } finally {
        await global.loading(m, conn, true);
    }
};

handler.help = ["gsmarena"];
handler.tags = ["search"];
handler.command = /^(gsmarena|specs)$/i;

export default handler;
