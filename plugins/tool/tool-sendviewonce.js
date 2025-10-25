/* todo:...
let handler = async (m, { conn }) => {
  const q = m.quoted;
  if (!q) return m.reply("Reply ke foto, video, atau audio.");

  const buffer = await q.download?.();
  if (!buffer) return m.reply("Gagal ambil media.");

  const mime = q.mimetype || "";
  const type = mime.startsWith("image/")
    ? "image"
    : mime.startsWith("video/")
      ? "video"
      : mime.startsWith("audio/")
        ? "audio"
        : null;

  if (!type) return m.reply("Bukan media yang bisa dikirim ulang.");

  const caption = q.text || "";
  const contextInfo = q.mentionedJid?.length
    ? { mentionedJid: q.mentionedJid }
    : {};

  await conn.sendMessage(
    m.chat,
    {
      [type]: buffer,
      mimetype: mime,
      caption,
      contextInfo,
      viewOnce: true,
    },
    { quoted: q.fakeObj || m }
  );
};

handler.help = ["svo"];
handler.tags = ["tools"];
handler.command = /^svo$/i;

export default handler;
*/