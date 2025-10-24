let handler = async (m, { conn }) => {
  const q = m.quoted || m;
  try {
    const msg = q?.msg?.message?.viewOnceMessageV2?.message || q.msg || q.message || {};
    const mediaMsg =
      msg.imageMessage ||
      msg.videoMessage ||
      msg.audioMessage ||
      msg.documentMessage;

    if (!mediaMsg) return m.reply("No media found in view-once message.");

    const buffer = await q.download?.();
    if (!buffer) return m.reply("Failed to retrieve media.");

    const mime = mediaMsg.mimetype || "";
    const type = mime.startsWith("image/")
      ? "image"
      : mime.startsWith("video/")
      ? "video"
      : mime.startsWith("audio/")
      ? "audio"
      : mime.startsWith("application/")
      ? "document"
      : null;

    if (!type) return m.reply("Unsupported media type.");

    await conn.sendMessage(
      m.chat,
      {
        [type]: buffer,
        mimetype: mime,
        caption: mediaMsg.caption || q.text || "",
      },
      { quoted: m }
    );
  } catch (e) {
    conn.logger.error(e);
    m.reply(`Error: ${e.message}`);
  }
};

handler.help = ["readviewonce"];
handler.tags = ["tools"];
handler.command = /^(read(view(once)?)?|rvo)$/i;

export default handler;