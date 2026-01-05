let handler = async (m, { conn, usedPrefix, command }) => {
  const quoted = m.quoted ? m.quoted : m;
  const mediaType = quoted.mtype || "";
  const mime = (quoted.msg || quoted).mimetype || "";

  const textToParse = m.text || "";
  const caption = textToParse
    .replace(new RegExp(`^[.!#/](${command})\\s*`, "i"), "")
    .trim();

  try {
    if (!mediaType && !caption) {
      return m.reply(
        `Reply to media or provide text.\nExamples: ${usedPrefix + command} Hello everyone! or ${usedPrefix + command} reply to image/video/audio`,
      );
    }

    await global.loading(m, conn);

    let content = {};

    if (mediaType === 'imageMessage' || /image/.test(mime)) {
      const uint8Array = await quoted.download();
      if (!uint8Array) return m.reply("Failed to download image.");
      
      const buffer = Buffer.from(uint8Array.buffer, uint8Array.byteOffset, uint8Array.byteLength);
      
      content = {
        image: buffer,
        caption: caption || "",
      };
    } else if (mediaType === 'videoMessage' || /video/.test(mime)) {
      const uint8Array = await quoted.download();
      if (!uint8Array) return m.reply("Failed to download video.");
      
      const buffer = Buffer.from(uint8Array.buffer, uint8Array.byteOffset, uint8Array.byteLength);
      
      content = {
        video: buffer,
        caption: caption || "",
      };
    } else if (mediaType === 'audioMessage' || mediaType === 'ptt' || /audio/.test(mime)) {
      const uint8Array = await quoted.download();
      if (!uint8Array) return m.reply("Failed to download audio.");
      
      const buffer = Buffer.from(uint8Array.buffer, uint8Array.byteOffset, uint8Array.byteLength);
      
      content = {
        audio: buffer,
        mimetype: "audio/mp4",
      };
    } else if (caption) {
      content = {
        text: caption,
      };
    } else {
      return m.reply(
        `Reply to media or provide text.\nExamples: ${usedPrefix + command} Hello everyone! or ${usedPrefix + command} reply to image/video/audio`,
      );
    }

    const { generateWAMessageContent, generateWAMessageFromContent } = 
      await import('baileys');

    const { backgroundColor, ...contentWithoutBg } = content;

    const inside = await generateWAMessageContent(contentWithoutBg, {
      upload: conn.waUploadToServer,
      backgroundColor: backgroundColor || undefined,
    });

    const messageSecret = new Uint8Array(32);
    crypto.getRandomValues(messageSecret);

    const msg = generateWAMessageFromContent(
      m.chat,
      {
        messageContextInfo: {
          messageSecret,
        },
        groupStatusMessageV2: {
          message: {
            ...inside,
            messageContextInfo: {
              messageSecret,
            },
          },
        },
      },
      {
        userJid: conn.user.id,
        quoted: m,
      }
    );

    await conn.relayMessage(m.chat, msg.message, {
      messageId: msg.key.id,
    });

    m.reply("Group status sent successfully.");
  } catch (e) {
    global.logger?.error(e);
    m.reply(`Error: ${e.message}`);
  } finally {
    await global.loading?.(m, conn, true);
  }
};

handler.help = ["groupstatus"];
handler.tags = ["owner"];
handler.command = /^(statusgc|swgc)$/i;
handler.owner = true;
handler.group = true;

export default handler;