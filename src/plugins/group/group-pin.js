let handler = async (m, { conn, args, usedPrefix, command }) => {
  if (!m.quoted) return m.reply("Reply message to pin");

  if (!args[0]) {
    return m.reply(
      `Pin duration\nEx:\n${usedPrefix + command} 1 = 1 day\n${usedPrefix + command} 2 = 7 days\n${usedPrefix + command} 3 = 30 days`
    );
  }

  const dur = {
    1: { sec: 86400, label: "1 day" },
    2: { sec: 604800, label: "7 days" },
    3: { sec: 2592000, label: "30 days" },
  };

  const opt = dur[args[0]];
  if (!opt) return m.reply("Invalid. Use 1, 2, or 3");

  const key = m.quoted?.vM?.key;
  if (!key) return m.reply("Cannot pin: no key");

  try {
    await conn.sendMessage(m.chat, {
      pin: key,
      type: 1,
      time: opt.sec,
    });
    m.reply(`Pinned for ${opt.label}`);
  } catch (e) {
    m.reply(`Error: ${e.message}`);
  }
};

handler.help = ["pin"];
handler.tags = ["group"];
handler.command = /^(pin)$/i;
handler.group = true;
handler.admin = true;
handler.botAdmin = true;

export default handler;