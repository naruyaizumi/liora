let handler = async (m, { conn, usedPrefix, command, args }) => {
  if (!args[0]) {
    return m.reply(
      `🍡 *Masukkan URL TikTok yang valid!*\n🍰 *Contoh: ${usedPrefix + command} https://vt.tiktok.com*`,
    );
  }

  const url = args[0];
  if (!/^https?:\/\/(www\.)?(vm\.|vt\.|m\.)?tiktok\.com\/.+/i.test(url)) {
    return m.reply("🍰 *URL tidak valid! Harap masukkan link TikTok yang benar.*");
  }

  await global.loading(m, conn);

  try {
    const res = await fetch(`https://api.nekolabs.my.id/downloader/tiktok?url=${url}`);
    const json = await res.json();
    const { videoUrl, images } = json?.result || {};

    if (videoUrl) {
      await conn.sendFile(
        m.chat,
        videoUrl,
        "tiktok.mp4",
        ``,
        m,
      );
    } else if (images?.length) {
      const items = images.map((img, i) => ({
        image: { url: img },
        caption: `📸 Slide ${i + 1} dari ${images.length}`,
      }));

      await conn.sendAlbum(m.chat, items, { quoted: m });
    } else {
      await m.reply("🍮 *Tidak ada media ditemukan dalam URL tersebut.*");
    }
  } catch (e) {
    console.error(e);
    await m.reply(`🍮 *Terjadi kesalahan:* ${e.message}`);
  } finally {
    await global.loading(m, conn, true);
  }
};

handler.help = ["tiktok"];
handler.tags = ["downloader"];
handler.command = /^(tiktok|tt)$/i;

export default handler;