import { removebg } from "#api/removebg.js";

let handler = async (m, { conn, command, usedPrefix }) => {
  const q = m.quoted?.mimetype ? m.quoted : m;
  const mime = (q.msg || q).mimetype || "";

  if (!/image\/(jpe?g|png|webp)/i.test(mime)) {
    return m.reply(`Send/reply image.\nEx: ${usedPrefix + command}`);
  }

  try {
    await global.loading(m, conn);

    const img = await q.download();
    if (!img) return m.reply("Invalid image");

    const { success, resultUrl, resultBuffer, error } = await removebg(img);
    if (!success) throw new Error(error || "Failed");

    await conn.sendMessage(
      m.chat,
      {
        image: resultBuffer ? resultBuffer : { url: resultUrl },
        caption: "BG removed",
      },
      { quoted: m },
    );
  } catch (e) {
    m.reply(`Error: ${e.message}`);
  } finally {
    await global.loading(m, conn, true);
  }
};

handler.help = ["removebg"];
handler.tags = ["tools"];
handler.command = /^(removebg)$/i;

export default handler;