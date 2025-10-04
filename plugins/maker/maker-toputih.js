import { uploader } from "../../lib/uploader.js";

let handler = async (m, { conn, usedPrefix, command }) => {
  try {
    let q = m.quoted ? m.quoted : m;
    let mime = (q.msg || q).mimetype || "";
    if (!mime)
      return m.reply(
        `🍰 *Balas atau kirim gambar dengan caption!*\n\n*Contoh: ${usedPrefix + command}*`,
      );
    if (!/image\/(jpeg|png|jpg)/.test(mime))
      return m.reply("❄️ *Format tidak valid! Gunakan JPG/PNG yaa~*");
    await global.loading(m, conn);
    let media = await q.download().catch(() => null);
    if (!media) return m.reply("💮 *Gagal mengunduh gambar!*");

    let uploaded = await uploader(media).catch(() => null);
    if (!uploaded) return m.reply("🌸 *Upload gagal!*");

    let apiUrl = global.API(
      "btz",
      "/api/maker/jadiputih",
      { url: uploaded },
      "apikey",
    );
    let response = await fetch(apiUrl);
    if (!response.ok) return m.reply("🍥 *Gagal menghubungi API!*");

    let buffer = Buffer.from(await response.arrayBuffer());

    await conn.sendFile(
      m.chat,
      buffer,
      "jadiputih.png",
      `✨🤍 *Gambar kamu berhasil jadi Putih Elegan!*`,
      m,
    );
  } catch (e) {
    console.error(e);
    m.reply(`🍩 *Ups ada error teknis!* 🍡\nDetail: ${e.message || e}`);
  } finally {
    await global.loading(m, conn, true);
  }
};

handler.help = ["toputih"];
handler.tags = ["maker"];
handler.command = /^(toputih|putih)$/i;

export default handler;
