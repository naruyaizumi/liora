import { fileTypeFromBuffer } from "file-type";

let handler = async (m, { conn, usedPrefix, command, args }) => {
  if (!args[0])
    return m.reply(
      `🍡 *Masukkan URL Instagram yang valid!*\n🍰 *Contoh: ${usedPrefix + command} https://www.instagram.com/*`,
    );

  const url = args[0];
  if (!/^https?:\/\/(www\.)?instagram\.com\//i.test(url))
    return m.reply("🍰 *URL tidak valid! Kirimkan link Instagram yang benar, ya.*");

  await global.loading(m, conn);
  try {
    const apiUrl = global.API("btz", "/api/download/igdowloader", { url }, "apikey");
    const json = await fetch(apiUrl).then(res => res.json());

    if (!json.status || !json.message?.length)
      return m.reply("🍓 *Kontennya nggak ditemukan!*");

    const sent = new Set();
    const album = [];

    for (const content of json.message) {
      if (!content._url || sent.has(content._url)) continue;
      sent.add(content._url);

      try {
        const res = await fetch(content._url);
        const buffer = Buffer.from(await res.arrayBuffer());
        const file = await fileTypeFromBuffer(buffer);
        if (!file) continue;

        if (file.mime.startsWith("image")) {
          album.push({
            image: buffer,
            caption: `🍡 Foto Instagram (${album.length + 1}/${json.message.length})`,
            filename: `ig_${Date.now()}.jpg`,
            mime: file.mime,
          });
        } else if (file.mime.startsWith("video")) {
          album.push({
            video: buffer,
            caption: `🍡 Video Instagram (${album.length + 1}/${json.message.length})`,
            filename: `ig_${Date.now()}.mp4`,
            mime: file.mime,
          });
        }
      } catch (err) {
        console.error("🍮 Gagal analisis konten:", content._url, err);
      }
    }

    if (album.length === 0)
      return m.reply("🍧 *Tidak ada konten valid yang bisa diunduh.*");

    if (album.length === 1) {
      const item = album[0];
      const type = item.image ? "image" : "video";
      await conn.sendFile(
        m.chat,
        item[type],
        item.filename,
        item.caption,
        m,
      );
      return;
    }

    await conn.sendAlbum(m.chat, album, { quoted: m });
  } catch (err) {
    console.error(err);
    m.reply("🍮 *Terjadi kesalahan saat mengambil data dari Instagram. Coba lagi nanti!*");
  } finally {
    await global.loading(m, conn, true);
  }
};

handler.help = ["instagram"];
handler.tags = ["downloader"];
handler.command = /^(instagram|ig|igdl)$/i;

export default handler;