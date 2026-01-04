let handler = async (m, { conn, text, command, usedPrefix }) => {
  if (!text) {
    return m.reply(
      `Enter the new bot name.\nExample: ${usedPrefix + command} Liora`,
    );
  }

  try {
    await conn.updateProfileName(text);

    const response = `
New Name: ${text}
WhatsApp bot name updated successfully.
`.trim();

    m.reply(response);
  } catch (e) {
    global.logger.error(e);
    m.reply(`Error: ${e.message}`);
  }
};

handler.help = ["setnamebot"];
handler.tags = ["owner"];
handler.command = /^set(name(bot)?)$/i;
handler.owner = true;

export default handler;
