let handler = async (m, { text, usedPrefix, command, conn }) => {
  try {
    const settings = global.db.data.settings[conn.user.lid] || {};

    if (!text) {
      const status = settings.self ? "ONLINE" : "OFFLINE";
      return m.reply(
        `Bot self mode: ${status}\nUse '${usedPrefix + command} on' or '${usedPrefix + command} off' to change mode.`,
      );
    }

    switch (text.toLowerCase()) {
      case "off":
      case "disable":
        if (!settings.self) return m.reply("Self mode is already disabled.");
        settings.self = false;
        return m.reply("Self mode disabled.");

      case "on":
      case "enable":
        if (settings.self) return m.reply("Self mode is already enabled.");
        settings.self = true;
        return m.reply("Self mode enabled.");

      default:
        return m.reply(
          `Invalid parameter.\nUsage: ${usedPrefix + command} on | off`,
        );
    }
  } catch (e) {
    global.logger.error(e);
    m.reply(`Error: ${e.message}`);
  }
};

handler.help = ["self"];
handler.tags = ["owner"];
handler.command = /^(self(mode)?)$/i;
handler.owner = true;

export default handler;