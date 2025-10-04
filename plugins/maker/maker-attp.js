import { addExif } from "../../src/bridge.js";

let handler = async (m, { conn, args, usedPrefix, command }) => {
  try {
    if (!args[0]) {
      return m.reply(
        `🍙 *Masukkan teks untuk dibuat ATTP yaa!*\n\n🍤 *Contoh: ${usedPrefix + command} Konichiwa~*`,
      );
    }

    await global.loading(m, conn);

    const apiUrl = global.API(
      "btz",
      "/api/maker/attp",
      { text: args.join(" ") },
      "apikey",
    );
    const res = await fetch(apiUrl);
    if (!res.ok) throw new Error("Gagal fetch dari API ATTP");

    const buffer = Buffer.from(await res.arrayBuffer());
    const stickerImage = await addExif(buffer, {
      packName: global.config.stickpack || "",
      authorName: global.config.stickauth || "",
      emojis: [],
    });

    await conn.sendFile(m.chat, stickerImage, "sticker.webp", "", m, false, {
      asSticker: true,
    });
  } catch (e) {
    console.error(e);
    m.reply(`🍩 *Ups error!* 🍧\n📄 ${e.message}`);
  } finally {
    await global.loading(m, conn, true);
  }
};

handler.help = ["attp"];
handler.tags = ["maker"];
handler.command = /^(attp)$/i;

export default handler;
