import { uploader } from "../../lib/uploader.js";

let handler = async (m, { conn, text, usedPrefix, command }) => {
    try {
        let q = m.quoted ? m.quoted : m;
        let mime = (q.msg || q).mimetype || "";
        let resultText = "";
        let prompt = text || "";

        if (!prompt && !mime) {
            return conn.sendMessage(
                m.chat,
                {
                    text: `✨ *Selamat Datang di Gemini AI!* ✨\n
*Gemini bisa membantu kamu dengan berbagai mode:*
🍰 *Teks: ${usedPrefix + command} Apa itu relativitas?*
🎧 *Audio: Balas audio dengan caption ${usedPrefix + command} Transkrip audio ini*
🖼️ *Gambar: Balas gambar dengan caption ${usedPrefix + command} Jelaskan gambar ini*
🎞️ *Video: Balas video dengan caption ${usedPrefix + command} Analisis video ini*

🩷 *Coba kirim pertanyaan atau media sekarang!*`,
                    contextInfo: {
                        externalAdReply: {
                            title: "Gemini AI",
                            body: "Powered by Google AI",
                            thumbnailUrl: "https://qu.ax/qqiCx.jpg",
                            sourceUrl: "https://gemini.google.com",
                            mediaType: 1,
                            renderLargerThumbnail: true,
                        },
                    },
                },
                { quoted: m }
            );
        }

        await global.loading(m, conn);

        const safeString = (val) => {
            if (typeof val === "string") return val;
            try {
                return JSON.stringify(val, null, 2);
            } catch {
                return String(val);
            }
        };

        if (mime.includes("audio")) {
            let media = await q.download().catch(() => null);
            if (!media) return m.reply("🍪 *Gagal mengunduh audio. Pastikan koneksi stabil ya~*");

            let linkUpload = await uploader(media).catch(() => null);
            if (!linkUpload)
                return m.reply("🍫 *Gagal mengunggah audio. Coba beberapa saat lagi ya~*");

            let inputText = prompt || "Tolong transkrip audio ini.";
            let apiUrl = global.API(
                "btz",
                "/api/search/bard-audio",
                { url: linkUpload, text: inputText },
                "apikey"
            );
            let response = await fetch(apiUrl);
            if (!response.ok)
                return m.reply("🍱 *Gagal memproses audio melalui Gemini. Coba lagi nanti!*");

            let json = await response.json();
            resultText = safeString(
                json?.result || "🍡 *Gemini tidak bisa mengenali isi audio ini!*"
            );
            prompt = inputText;
        } else if (mime.includes("image")) {
            let media = await q.download().catch(() => null);
            if (!media) return m.reply("🍪 *Gagal mengunduh gambar. Pastikan koneksi stabil ya~*");

            let linkUpload = await uploader(media).catch(() => null);
            if (!linkUpload)
                return m.reply("🍫 *Gagal mengunggah gambar. Coba beberapa saat lagi ya~*");

            if (!prompt)
                return m.reply(
                    `🍬 *Masukkan teks untuk analisis gambar!*\n\n🍡 *Contoh: ${usedPrefix + command} Jelaskan gambar ini!*`
                );

            let apiUrl = global.API(
                "btz",
                "/api/search/bard-img",
                { url: linkUpload, text: prompt },
                "apikey"
            );
            let response = await fetch(apiUrl);
            if (!response.ok)
                return m.reply("🍱 *Gagal memproses gambar melalui Gemini. Coba lagi nanti!*");

            let json = await response.json();
            resultText = safeString(json?.result || "🍙 *Gemini tidak bisa memahami gambar ini!*");
        } else if (mime.includes("video")) {
            let media = await q.download().catch(() => null);
            if (!media) return m.reply("🍪 *Gagal mengunduh video. Pastikan koneksi stabil ya~*");

            let linkUpload = await uploader(media).catch(() => null);
            if (!linkUpload)
                return m.reply("🍫 *Gagal mengunggah video. Coba beberapa saat lagi ya~*");

            if (!prompt)
                return m.reply(
                    `🍬 *Masukkan teks untuk analisis video!*\n\n🍡 *Contoh: ${usedPrefix + command} Tolong analisis video ini!*`
                );

            let apiUrl = global.API(
                "btz",
                "/api/search/bard-video",
                { url: linkUpload, text: prompt },
                "apikey"
            );
            let response = await fetch(apiUrl);
            if (!response.ok)
                return m.reply("🍱 *Gagal memproses video melalui Gemini. Coba lagi nanti!*");

            let json = await response.json();
            resultText = safeString(json?.result || "🍙 *Gemini tidak bisa memahami video ini!*");
        } else {
            let apiUrl = global.API("btz", "/api/search/bard-ai", { text: prompt }, "apikey");
            let response = await fetch(apiUrl);
            if (!response.ok)
                return m.reply("🍫 *Ups! Gagal mengakses Gemini. Coba lagi nanti ya~*");

            let json = await response.json();
            resultText = safeString(
                json?.message || "🍪 *Gemini belum bisa jawab sekarang. Coba lagi nanti ya~*"
            );
        }

        await conn.sendMessage(
            m.chat,
            {
                text: `🍰 *Gemini AI:* ${resultText}`,
                contextInfo: {
                    externalAdReply: {
                        title: "Gemini AI",
                        body: "Powered by Google AI",
                        thumbnailUrl: "https://qu.ax/qqiCx.jpg",
                        sourceUrl: "https://gemini.google.com",
                        mediaType: 1,
                        renderLargerThumbnail: true,
                    },
                },
            },
            { quoted: m }
        );
    } catch (e) {
        console.error(e);
        m.reply(`❌ *Terjadi Kesalahan Teknis!*\n🍭 *Detail:* ${e.message}`);
    } finally {
        await global.loading(m, conn, true);
    }
};

handler.help = ["gemini"];
handler.tags = ["ai"];
handler.command = /^(gemini)$/i;

export default handler;
