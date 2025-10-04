import { uploader } from "../../lib/uploader.js";

let handler = async (m, { conn, usedPrefix, command }) => {
  try {
    let q = m.quoted ? m.quoted : m;
    let mime = (q.msg || q).mimetype || "";
    if (!mime)
      return m.reply(
        `🌸 *Balas atau kirim gambar dengan caption!*\n\n*Contoh: ${usedPrefix + command}*`,
      );
    if (!/image\/(jpeg|png|jpg)/.test(mime))
      return m.reply("🍭 *Format gambar tidak didukung!*");
    await global.loading(m, conn);
    let media = await q.download().catch(() => null);
    if (!media)
      return m.reply("🍩 *Gagal mengunduh gambar! Pastikan file tidak rusak.*");

    let uploaded = await uploader(media).catch(() => null);
    if (!uploaded) return m.reply("🍬 *Gagal mengunggah gambar!*");

    let apiUrl = global.API(
      "btz",
      "/api/maker/jadihijab",
      { url: uploaded },
      "apikey",
    );
    let response = await fetch(apiUrl);
    if (!response.ok)
      return m.reply(
        "🍪 *Terjadi kesalahan saat memproses gambar. Coba lagi nanti!*",
      );

    let buffer = Buffer.from(await response.arrayBuffer());

    await conn.sendFile(
      m.chat,
      buffer,
      "jadihijab.png",
      `🍰 *Gambar berhasil dikonversi ke versi Hijab!*`,
      m,
    );
  } catch (e) {
    console.error(e);
    m.reply(`🍡 *Terjadi Kesalahan Teknis!*\n🍥 *Detail:* ${e.message || e}`);
  } finally {
    await global.loading(m, conn, true);
  }
};

handler.help = ["tohijab"];
handler.tags = ["maker"];
handler.command = /^(tohijab|hijab)$/i;

export default handler;
