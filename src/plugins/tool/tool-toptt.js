import { convert } from "#lib/convert.js";

let handler = async (m, { conn, usedPrefix, command }) => {
  try {
    const q = m.quoted ? m.quoted : m;
    const mime = (q.msg || q).mimetype || q.mediaType || "";

    if (!mime || !/^(video|audio)\//.test(mime))
      return m.reply(
        `Reply a video or audio with command:\n› ${usedPrefix + command}`,
      );

    await global.loading(m, conn);

    const data = await q.download?.();
    if (!data || !(data instanceof Uint8Array) || data.length === 0)
      return m.reply("Failed to get media data.");

    const audioUint8 = await convert(data, {
      format: "opus",
      sampleRate: 48000,
      channels: 1,
      bitrate: "64k",
      ptt: true,
    });

    const audioBuffer = Buffer.from(
      audioUint8.buffer,
      audioUint8.byteOffset,
      audioUint8.byteLength,
    );

    await conn.sendMessage(
      m.chat,
      {
        audio: audioBuffer,
        mimetype: "audio/ogg; codecs=opus",
        ptt: true,
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

handler.help = ["toptt"];
handler.tags = ["tools"];
handler.command = /^(toptt|tovn)$/i;

export default handler;
