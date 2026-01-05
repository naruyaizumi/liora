import { convert } from "#lib/convert.js";
import { play } from "#api/play.js";

let handler = async (m, { conn, args, usedPrefix, command }) => {
  if (!args[0])
    return m.reply(
      `Please provide a song title.\n› Example: ${usedPrefix + command} Bye`,
    );

  await global.loading(m, conn);

  try {
    const result = await play(args.join(" "));

    if (!result?.success) {
      throw new Error(result?.error || "Failed to get audio");
    }

    const { title, channel, cover, url, downloadUrl } = result;

    if (!downloadUrl) {
      throw new Error("No download URL returned");
    }

    const audioRes = await fetch(downloadUrl);
    if (!audioRes.ok) {
      throw new Error(
        `Failed to fetch audio: ${audioRes.status} ${audioRes.statusText}`,
      );
    }

    const audioArrayBuffer = await audioRes.arrayBuffer();
    const audioUint8 = new Uint8Array(audioArrayBuffer);

    if (audioUint8.length === 0) {
      throw new Error("Audio data is empty");
    }

    const converted = await convert(audioUint8, {
      format: "opus",
      bitrate: "128k",
      channels: 1,
      sampleRate: 48000,
      ptt: true,
    });

    if (!converted || converted.length === 0) {
      throw new Error("Audio conversion failed");
    }

    const audioBuffer = Buffer.from(
      converted.buffer,
      converted.byteOffset,
      converted.byteLength,
    );

    await conn.sendMessage(
      m.chat,
      {
        audio: audioBuffer,
        mimetype: "audio/ogg; codecs=opus",
        ptt: true,
        contextInfo: {
          externalAdReply: {
            title: title,
            body: channel,
            thumbnailUrl: cover,
            mediaUrl: url,
            mediaType: 2,
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

handler.help = ["play"];
handler.tags = ["downloader"];
handler.command = /^(play)$/i;

export default handler;
