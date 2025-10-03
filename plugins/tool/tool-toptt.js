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
    if (!Buffer.isBuffer(buffer) || buffer.length === 0) {
      return m.reply("🍔 *Gagal ambil buffer media!*");
    }

    let audio = await convert(buffer, {
      format: "opus",
      sampleRate: 48000,
      channels: 1,
      bitrate: "64k"
    });

    if (!Buffer.isBuffer(audio) || audio.length === 0) {
      return m.reply("🍡 *Konversi gagal, hasil kosong!*");
    }

    await conn.sendFile(
      m.chat,
      audio,
      "voice.ogg",
      "",
      m,
      true,
      {
        mimetype: "audio/ogg; codecs=opus",
        ptt: true
      }
    );
  } catch (e) {
    console.error(e);
    m.reply(`🥟 *Terjadi kesalahan saat konversi!*\n🍧 ${e.message}`);
  } finally {
    await global.loading(m, conn, true);
  }
};

handler.help = ["toptt", "tovn"];
handler.tags = ["tools"];
handler.command = /^(toptt|tovn)$/i;

export default handler;