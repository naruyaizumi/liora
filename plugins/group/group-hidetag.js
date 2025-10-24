let handler = async (m, { conn, text, participants }) => {
  try {
    const q = m.quoted || m;
    const mime = (q.msg || q).mimetype || "";
    const teks = text || q.text || "";
    const users = participants.map(p => p.id);
    const mappedMentions = [];

    let finalText = teks;
    if (teks) {
      for (const p of participants) {
        const jid = p.id;
        const lid = p.lid;
        const username = jid.split("@")[0];

        if (lid && teks.includes("@" + lid.split("@")[0])) {
          mappedMentions.push(jid);
          finalText = finalText.replace("@" + lid.split("@")[0], "@" + username);
        }
        if (teks.includes("@" + username)) {
          mappedMentions.push(jid);
        }
      }
    }

    const finalMentions = [...new Set([...users, ...mappedMentions])];
    const sendOpts = { quoted: m, mentions: finalMentions };

    if (mime) {
      const media = await q.download();
      const messageContent = {};

      if (/image/.test(mime)) {
        messageContent.image = media;
      } else if (/video/.test(mime)) {
        messageContent.video = media;
      } else if (/audio/.test(mime)) {
        messageContent.audio = media;
        messageContent.ptt = true;
      } else if (/document/.test(mime)) {
        messageContent.document = media;
        messageContent.mimetype = mime;
        messageContent.fileName = "file";
      } else {
        return m.reply("Unsupported media type.");
      }

      if (finalText) messageContent.caption = finalText;

      await conn.sendMessage(m.chat, messageContent, sendOpts);
    } else if (finalText) {
      await conn.sendMessage(m.chat, { text: finalText, mentions: finalMentions }, { quoted: m });
    } else {
      m.reply("Please provide media or text, or reply to a message.");
    }
  } catch (e) {
    conn.logger.error(e);
    m.reply(`Error: ${e.message}`);
  }
};

handler.help = ["hidetag"];
handler.tags = ["group"];
handler.command = /^(hidetag|ht|h)$/i;
handler.group = true;
handler.admin = true;

export default handler;