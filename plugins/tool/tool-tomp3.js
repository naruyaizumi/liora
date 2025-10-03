import { convert } from "../../src/bridge.js";

let handler = async (m, { conn, usedPrefix, command }) => {
  try {
    let q = m.quoted ? m.quoted : m;
    let mime = (q.msg || q).mimetype || q.mediaType || "";

    if (!mime || !/^(video|audio)\//.test(mime)) {
      return m.reply(
        `🍙 *Balas video atau audio dengan perintah ${usedPrefix + command}*`
      );
    }

    await global.loading(m, conn);
    let buffer = await q.download?.();
    if (!Buffer.isBuffer(buffer)) return m.reply("🍔 *Gagal ambil buffer media!*");
    let audio = await convert(buffer, { format: "mp3" });
    if (!Buffer.isBuffer(audio) || audio.length === 0) {
      return m.reply("🍡 *Konversi gagal, hasil kosong!*");
    }

    await conn.sendFile(
      m.chat,
      audio,
      "output.mp3",
      "🍱 *Berhasil dikonversi ke MP3!*",
      m,
      false,
      { mimetype: "audio/mpeg" }
    );
  } catch (e) {
    console.error(e);
    m.reply(`🥟 *Terjadi kesalahan saat konversi!*\n🍧 ${e.message}`);
  } finally {
    await global.loading(m, conn, true);
  }
};

handler.help = ["tomp3"];
handler.tags = ["tools"];
handler.command = /^(tomp3|toaudio)$/i;

export default handler;