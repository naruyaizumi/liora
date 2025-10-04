import { uploader } from "../../lib/uploader.js";

let handler = async (m, { conn, usedPrefix, command }) => {
  try {
    let q = m.quoted ? m.quoted : m;
    let mime = (q.msg || q).mimetype || "";
    if (!mime || !/^image\/(jpe?g|png|webp)$/.test(mime)) {
      return m.reply(
        `🍪 *Balas gambar atau kirim dengan caption: ${usedPrefix + command}*`,
      );
    }

    await global.loading(m, conn);

    let img = await q.download();
    let url = await uploader(img).catch(() => null);
    if (!url) throw new Error("❌ Gagal mengunggah gambar!");

    let res = await fetch(
      `https://api.nekolabs.my.id/tools/nsfw-checker?imageUrl=${url}`,
    );
    let json = await res.json();
    if (!json?.status) throw new Error("⚠️ Gagal mengambil data NSFW!");

    let result = json.result;
    let caption = `
🍰 *Hasil NSFW Checker*
🔖 *Label: ${result.labelName}*
📈 *Confidence: ${(result.confidence * 100).toFixed(2)}%*
`.trim();

    await conn.sendMessage(m.chat, { image: img, caption }, { quoted: m });
  } catch (err) {
    console.error(err);
    m.reply(`❌ Terjadi error: ${err.message || err}`);
  } finally {
    await global.loading(m, conn, true);
  }
};

handler.help = ["ceknsfw"];
handler.tags = ["ai"];
handler.command = /^(ceknsfw|nsfwcek)$/i;

export default handler;
