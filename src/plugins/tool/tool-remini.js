import { remini } from "#api/remini.js";

let handler = async (m, { conn, command, usedPrefix }) => {
  const q = m.quoted && m.quoted.mimetype ? m.quoted : m;
  const mime = (q.msg || q).mimetype || "";

  if (
    !q ||
    typeof q.download !== "function" ||
    !/image\/(jpe?g|png|webp)/i.test(mime)
  ) {
    return m.reply(
      `Please send or reply to an image before using this command.\nExample: ${usedPrefix}${command} < reply to image or send image with caption`,
    );
  }

  try {
    await global.loading(m, conn);
    const data = await q.download().catch(() => null);
    if (!data || !(data instanceof Uint8Array))
      return m.reply("Invalid image data.");
      
    const { success, resultUrl, resultBuffer, error } = await remini(data);
    if (!success) throw new Error(error || "Enhancement failed");

    if (resultBuffer) {
      const buffer = resultBuffer instanceof Uint8Array
        ? Buffer.from(resultBuffer.buffer, resultBuffer.byteOffset, resultBuffer.byteLength)
        : resultBuffer;
      
      await conn.sendMessage(
        m.chat,
        {
          image: buffer,
          caption: "Image enhancement successful.",
        },
        { quoted: m },
      );
    } else {
      await conn.sendMessage(
        m.chat,
        {
          image: { url: resultUrl },
          caption: "Image enhancement successful.",
        },
        { quoted: m },
      );
    }
  } catch (e) {
    global.logger.error(e);
    m.reply("Failed to enhance image.");
  } finally {
    await global.loading(m, conn, true);
  }
};

handler.help = ["hd"];
handler.tags = ["tools"];
handler.command = /^(remini|hd)$/i;

export default handler;