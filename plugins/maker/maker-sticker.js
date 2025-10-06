import { sticker } from "../../src/bridge.js";

let handler = async (m, { conn, args, usedPrefix, command }) => {
  try {
    let q = m.quoted ? m.quoted : m;
    let mime = (q.msg || q).mimetype || q.mediaType || "";
    if (!mime && !args[0]) {
      return m.reply(
        `🍚 *Reply/kirim gambar, gif, atau video dengan perintah* ${usedPrefix + command}`,
      );
    }

    await global.loading(m, conn);

    let buffer;
    if (args[0] && isUrl(args[0])) {
      const res = await fetch(args[0]);
      if (!res.ok) throw new Error("Gagal mengambil file dari URL.");
      buffer = Buffer.from(await res.arrayBuffer());
    } else {
      const media = await q.download?.();
      if (!media) return m.reply("🍩 *Gagal download media!*");
      buffer = Buffer.isBuffer(media)
        ? media
        : media.data
        ? Buffer.from(media.data)
        : null;
    }

    if (!buffer) throw new Error("Buffer kosong, file gagal diproses.");

    let opts = {
      crop: true,
      quality: 90,
      fps: 15,
      maxDuration: 15,
      packName: global.config.stickpack || "",
      authorName: global.config.stickauth || "",
      emojis: [],
    };

    let result = await sticker(buffer, opts);
    const maxSize = 1024 * 1024;
    let step = 0;
    while (result.length > maxSize && step < 4) {
      step++;
      opts.quality -= 10;
      if (opts.quality < 50) opts.quality = 50;
      if (step >= 2) opts.fps = Math.max(8, opts.fps - 2);
      result = await sticker(buffer, opts);
    }

    await conn.sendMessage(m.chat, { sticker: result }, { quoted: m });
  } catch (e) {
    console.error(e);
    await m.reply("❌ *Gagal membuat stiker:* " + e.message);
  } finally {
    await global.loading(m, conn, true);
  }
};

handler.help = ["sticker"];
handler.tags = ["maker"];
handler.command = /^(s(tic?ker)?)$/i;

export default handler;

const isUrl = (text) =>
  /^https?:\/\/.+\.(jpe?g|png|gif|mp4|webm|mkv|mov)$/i.test(text);