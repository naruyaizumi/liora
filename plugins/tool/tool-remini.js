import { uploader } from "../../lib/uploader.js";

let handler = async (m, { conn, args, command }) => {
  try {
    await global.loading(m, conn);
    const version = ["1", "2", "3", "4"].includes(args[0]) ? args[0] : "1";
    const q = m.quoted ? m.quoted : m;
    
    if (!q || typeof q.download !== "function")
      return m.reply("🍩 *Kirim atau reply gambar yang ingin diproses dulu ya~*");

    const media = await q.download().catch(() => null);
    if (!media || !(media instanceof Buffer))
      return m.reply("🍰 *Gagal mengunduh media atau format tidak dikenali!*");

    const url = await uploader(media).catch(() => null);
    if (!url) return m.reply("🍜 *Gagal mengunggah gambar, coba lagi nanti~*");

    const endpointMap = {
      "1": "/api/tools/remini",
      "2": "/api/tools/remini-v2",
      "3": "/api/tools/remini-v3",
      "4": "/api/tools/remini-v4",
    };

    const params =
      version === "3"
        ? { url, resolusi: 4 }
        : version === "4"
        ? { url, resolusi: 16 }
        : { url };

    const api = global.API("btz", endpointMap[version], params, "apikey");
    const res = await fetch(api);

    if (!res.ok) throw "Gagal memproses gambar.";
    const json = await res.json();

    if (!json.status || !json.url)
      throw "🍕 *Gagal mendapatkan hasil dari server.*";

    await conn.sendMessage(
      m.chat,
      {
        image: { url: json.url },
        caption: `🍧 *Gambar berhasil diproses dengan ${command.toUpperCase()} (V${version})!*`,
      },
      { quoted: m },
    );
  } catch (e) {
    console.error(e);
    m.reply(`🍮 *Terjadi kesalahan!*\n📌 *Detail:* ${e.message || e}`);
  } finally {
    await global.loading(m, conn, true);
  }
};

handler.help = ["remini"];
handler.tags = ["tools"];
handler.command = /^(remini|hd)$/i;

export default handler;