import { convert } from "#lib/convert.js";
import { spotify } from "#api/spotify.js";

let handler = async (m, { conn, args, usedPrefix, command }) => {
  if (!args[0])
    return m.reply(
      `Please provide a song title.\n› Example: ${usedPrefix + command} Swim`,
    );

  await global.loading(m, conn);
  try {
    const {
      success,
      title,
      channel,
      cover,
      url,
      downloadUrl,
      duration,
      error,
    } = await spotify(args.join(" "));
    if (!success) throw new Error(error);

    const audioRes = await fetch(downloadUrl);
    if (!audioRes.ok)
      throw new Error(`Failed to fetch audio. Status: ${audioRes.status}`);

    const buffer = Buffer.from(await audioRes.arrayBuffer());

    const audio = await convert(buffer, {
      format: "opus",
      sampleRate: 48000,
      channels: 1,
      bitrate: "64k",
      ptt: true,
    });

    const finalBuffer =
      audio instanceof Buffer
        ? audio
        : audio?.buffer
          ? Buffer.from(audio.buffer)
          : audio?.data
            ? Buffer.from(audio.data)
            : Buffer.from(audio);

    await conn.sendMessage(
      m.chat,
      {
        audio: finalBuffer,
        mimetype: "audio/ogg; codecs=opus",
        ptt: true,
        contextInfo: {
          externalAdReply: {
            title,
            body: channel,
            thumbnailUrl: cover,
            mediaUrl: url,
            mediaType: 1,
            renderLargerThumbnail: true,
          },
        },
      },
      { quoted: m },
    );
  } catch (e) {
    global.logger.error(e);
    m.reply(`Error: ${e.message}`);
  } finally {
    await global.loading(m, conn, true);
  }
};

handler.help = ["spotify"];
handler.tags = ["downloader"];
handler.command = /^(spotify|sp)$/i;

export default handler;
