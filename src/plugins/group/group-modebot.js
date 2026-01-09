let handler = async (m, { text, usedPrefix, command }) => {
  const chat = global.db.data.chats[m.chat];

  if (!text) {
    const status = chat.mute ? "OFF" : "ON";
    return m.reply(`Bot: ${status}\nUse: ${usedPrefix + command} on/off`);
  }

  switch (text.toLowerCase()) {
    case "off":
    case "mute":
      if (chat.mute) return m.reply("Already OFF");
      chat.mute = true;
      return m.reply("Bot OFF");

    case "on":
    case "unmute":
      if (!chat.mute) return m.reply("Already ON");
      chat.mute = false;
      return m.reply("Bot ON");

    default:
      return m.reply(`Invalid\nUse: ${usedPrefix + command} on/off`);
  }
};

handler.help = ["botmode"];
handler.tags = ["group"];
handler.command = /^(bot(mode)?)$/i;
handler.owner = true;

export default handler;