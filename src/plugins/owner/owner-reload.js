let handler = async (m, { conn }) => {
  try {
    await global.reloadAllPlugins();
    await global.reloadHandler();
    await m.reply("Reloaded successfully!");
  } catch (e) {
    m.reply(`Error: ${e.message}`);
    global.logger.error({ error: e.message }, "Reload command error");
  }
};

handler.help = ["reload"];
handler.tags = ["owner"];
handler.command = /^(reload|rl)$/i;
handler.owner = true;

export default handler;
