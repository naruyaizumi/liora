let handler = async (m, { conn }) => {
  await global.reloadAllPlugins();
  await global.reloadHandler();
  m.reply("Reloaded");
};

handler.help = ["reload"];
handler.tags = ["owner"];
handler.command = /^(reload|rl)$/i;
handler.owner = true;

export default handler;