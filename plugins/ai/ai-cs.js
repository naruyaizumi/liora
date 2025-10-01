import { uploader } from "../../lib/uploader.js";

let handler = async (m, { conn }) => {
    if (!m.quoted)
        return m.reply("⚠️ *Balas pesan gambar atau teks yang berisi error untuk diperbaiki!*");
    let mediaUrl = null;
    let mediaSource = null;
    let text = (m.quoted.text || m.quoted.caption || "").trim();
    await global.loading(m, conn);
    if (m.quoted && /image/.test(m.quoted.mimetype)) {
        mediaSource = m.quoted;
        try {
            let media = await mediaSource.download();
            let link = await uploader(media).catch(() => null);
            if (link) mediaUrl = link;
        } catch (e) {
            console.log(e);
        }
    }
    try {
        let prompt = `Tolong perbaiki error (JavaScript Node.js) dari konten berikut ini. Berikan solusi langsung, dan kalau memungkinkan berikan perbaikan kodenya secara singkat. Penjelasan boleh disertakan, tapi prioritaskan solusi.`;
        let endpoint = mediaUrl
            ? global.API(
                  "btz",
                  "/api/search/bard-img",
                  { url: mediaUrl, text: prompt + "\n\n" + text },
                  "apikey"
              )
            : global.API("btz", "/api/search/bard-ai", { text: prompt + "\n\n" + text }, "apikey");
        let res = await fetch(endpoint);
        let json = await res.json();
        if (!json?.result && !json?.message) return m.reply("❌ *Gagal mendapatkan solusi.*");
        await conn.reply(m.chat, json.result || json.message, m);
    } catch (e) {
        console.error(e);
        await conn.reply(
            m.chat,
            "💥 *Terjadi error saat memproses solusi.*",
            m
        );
    } finally {
        await global.loading(m, conn, true);
    }
};

handler.help = ["cs"];
handler.tags = ["ai"];
handler.command = /^cs$/i;
handler.owner = true;

export default handler;
