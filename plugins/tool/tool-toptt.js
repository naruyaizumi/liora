import { convert } from "../../lib/convert.js";

let handler = async (m, { conn, usedPrefix, command }) => {
    try {
        let q = m.quoted ? m.quoted : m;
        let mime = (q.msg || q).mimetype || q.mediaType || "";
        if (!/^(video|audio)\//.test(mime)) {
            return m.reply(`🍙 *Balas video atau voice note dengan perintah* \`${usedPrefix + command}\``);
        }

        await global.loading(m, conn);

        let type = mime.split("/")[0];
        let media = await conn.downloadM(q, type);
        if (!media) return m.reply("🍔 *Gagal mengunduh media!*");

        let audio = await convert(media, { format: "mp3" });
        if (!audio) return m.reply("🍡 *Konversi gagal!*");

        await conn.sendFile(
            m.chat,
            audio,
            "voice.mp3",
            "",
            m,
            true,
            { mimetype: "audio/mpeg" }
        );
    } catch (e) {
        console.error(e);
        m.reply(`🥟 *Terjadi kesalahan saat konversi!*\n🍧 ${e.message}`);
    } finally {
        await global.loading(m, conn, true);
    }
};

handler.help = ["toptt"];
handler.tags = ["tools"];
handler.command = /^(toptt|tovn)$/i;

export default handler;