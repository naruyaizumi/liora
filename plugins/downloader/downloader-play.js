let handler = async (m, { conn, args, usedPrefix, command }) => {
  if (!args[0]) {
    return m.reply(
      `🍙 *Masukkan judul lagu untuk dicari!*\n*Contoh: ${usedPrefix + command} Serana*`,
    );
  }

  let query = args.join(" ");
  await global.loading(m, conn);

  try {
    let res = await fetch(
      `https://api.nekolabs.my.id/downloader/youtube/play/v1?q=${query}`,
    );
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    let json = await res.json();

    if (!json.status || !json.result?.downloadUrl) {
      return m.reply("🍣 *Gagal menemukan atau mengunduh audio!*");
    }

    let { title, channel, duration, cover, url } = json.result.metadata;
    let audioUrl = json.result.downloadUrl;

    await conn.sendFile(m.chat, audioUrl, `${title}.mp3`, "", m, true, {
      mimetype: "audio/mpeg",
      contextInfo: {
        externalAdReply: {
          title: title,
          body: `${channel} • ${duration}`,
          thumbnailUrl: cover,
          mediaUrl: url,
          mediaType: 2,
          renderLargerThumbnail: true,
        },
      },
    });
  } catch (e) {
    console.error(e);
    m.reply("🍤 *Terjadi kesalahan saat mengambil data YouTube!*");
  } finally {
    await global.loading(m, conn, true);
  }
};

handler.help = ["play"];
handler.tags = ["downloader"];
handler.command = /^(play)$/i;

export default handler;
