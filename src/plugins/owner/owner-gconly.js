let handler = async (m, { text, usedPrefix, command, conn }) => {
  try {
    const settings = global.db.data.settings[conn.user.lid] || {};

    if (!text) {
      const status = settings.gconly ? "ON" : "OFF";
      return m.reply(
        `GC Only mode: ${status}\nUse '${usedPrefix + command} on' or '${usedPrefix + command} off' to change mode.`,
      );
    }

    switch (text.toLowerCase()) {
      case "off":
      case "disable":
        if (!settings.gconly) return m.reply("GC Only mode is already disabled.");
        settings.gconly = false;
        return m.reply("GC Only mode disabled.");

      case "on":
      case "enable":
        if (settings.gconly) return m.reply("GC Only mode is already enabled.");
        settings.gconly = true;
        return m.reply("GC Only mode enabled.");

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

handler.help = ["gconly"];
handler.tags = ["owner"];
handler.command = /^(gconly|grouponly)$/i;
handler.owner = true;

export default handler;