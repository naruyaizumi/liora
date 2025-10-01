
import { uploader } from "../../lib/uploader.js";

let handler = async (m, { conn, usedPrefix, command }) => {
    try {
        let q = m.quoted && m.quoted.mimetype ? m.quoted : m;
        let mime = (q.msg || q).mimetype || "";

        if (!/image\/(jpe?g|png)/i.test(mime)) {
            return m.reply(
                `🍡 *Kirim atau reply gambar dengan caption ${usedPrefix + command}*`
            );
        }

        await global.loading(m, conn);

        let img = await q.download();
        if (!img) return m.reply("🍫 *Gagal mengunduh gambar!*");

        let url = await uploader(img).catch(() => null);
        if (!url) return m.reply("🍫 *Gagal mengunggah gambar ke server!*");

        let api = global.API("btz", "/api/tools/removebg", { url }, "apikey");
        let res = await fetch(api);
        let json = await res.json();

        if (!json.status || !json.url) throw "🍩 *Gagal menghapus background!*";

        await conn.sendFile(
            m.chat,
            json.url,
            "removebg.png",
            "🍓 *Background berhasil dihapus!* 🧁",
            m
        );
    } catch (e) {
        console.error(e);
        m.reply("🍩 *Ehh, ada kesalahan teknis~* 🍬");
    } finally {
        await global.loading(m, conn, true);
    }
};

handler.help = ["removebg"];
handler.tags = ["tools"];
handler.command = /^(removebg)$/i;

export default handler;