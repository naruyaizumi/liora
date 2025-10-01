let handler = async (m, { conn }) => {
    try {
        await global.loading(m, conn);

        const response = await fetch("https://cloudku.us.kg/api/murotal/random/surah");
        if (!response.ok) {
            return m.reply("🍩 *Gagal menghubungi API! Coba lagi nanti ya~*");
        }

        const json = await response.json();
        if (!json.status || json.status !== "success" || !json.result) {
            return m.reply("🍫 *Gagal memproses permintaan!* Coba lagi ya~");
        }

        const {
            audio_url,
            name_en,
            name_id,
            number,
            number_of_verses,
            revelation_id,
            translation_id,
        } = json.result;

        await conn.sendFile(m.chat, audio_url, `${name_en}.mp3`, null, m, true, {
            mimetype: "audio/mpeg",
            ptt: false,
            contextInfo: {
                externalAdReply: {
                    title: `🍯 Surah ${name_en} (${name_id})`,
                    body: `🍬 Nomor: ${number} | Ayat: ${number_of_verses} | Turun: ${revelation_id} | Arti: ${translation_id}`,
                    mediaType: 1,
                    thumbnailUrl: "https://files.cloudkuimages.guru/images/dedfa0695b71.jpg",
                    renderLargerThumbnail: true,
                    sourceUrl: "https://quran.com/" + number,
                },
            },
        });
    } catch (e) {
        console.error(e);
        return m.reply("🍩 *Terjadi kesalahan saat memproses permintaan!*");
    } finally {
        await global.loading(m, conn, true);
    }
};

handler.help = ["randomsurah"];
handler.tags = ["islam"];
handler.command = /^(randomsurah|surahacak)$/i;

export default handler;
