import { convert } from "../../lib/convert.js";

let handler = async (m, { conn }) => {
    try {
        let q = m.quoted || m;
        let mime = (q.msg || q).mimetype || "";
        if (!/^(video|audio)\//.test(mime)) {
            return m.reply("🍙 *Balas video atau voice note yang ingin dikonversi ke MP3!*");
        }
        await global.loading(m, conn);
        let type = mime.split("/")[0];
        let media = await conn.downloadM(q, type);
        if (!media) return m.reply("🍔 *Gagal mengunduh media!*");
        let audio = await convert(media, { format: "mp3" });
        if (!audio) return m.reply("🍡 *Konversi gagal!*");
        await conn.sendFile(m.chat, audio, "convert.mp3", "", m, false, {
            mimetype: "audio/mpeg",
        });
    } catch (e) {
        console.error(e);
        m.reply("🍡 *Terjadi kesalahan saat konversi!*");
    } finally {
        await global.loading(m, conn, true);
    }
};

handler.help = ["tomp3"];
handler.tags = ["audio"];
handler.command = /^(tomp3|toaudio)$/i;

export default handler;
