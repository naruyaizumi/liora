import { sticker } from "../../lib/sticker.js";

let handler = async (m, { conn, args, usedPrefix, command }) => {
  try {
    if (!args[0]) {
      return m.reply(
        `🍙 *Masukkan teks untuk dibuat Brat Sticker yaa!*\n\n🍤 *Contoh:* ${usedPrefix + command} Konichiwa~`
      );
    }

    await global.loading(m, conn);

    const response = await fetch(
      global.API("btz", "/api/maker/brat", { text: args.join(" ") }, "apikey")
    );

    if (!response.ok) {
      return m.reply("🍜 *Aduh... gagal memproses teks, coba lagi nanti yaa!*");
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    
    const file = await conn.getFile(buffer, true);

    const stickerImage = await sticker(file, {
      packName: global.config.stickpack,
      authorName: global.config.stickauth,
    });

    await conn.sendFile(m.chat, stickerImage, "sticker.webp", "", m, false, { asSticker: true });
  } catch (e) {
    console.error(e);
    m.reply(`🍩 *Yaaah ada error!*`);
  } finally {
    await global.loading(m, conn, true);
  }
};

handler.help = ["brat"];
handler.tags = ["maker"];
handler.command = /^(brat)$/i;

export default handler;