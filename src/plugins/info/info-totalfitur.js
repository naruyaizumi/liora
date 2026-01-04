let handler = async (m, { conn }) => {
  const plugins = Object.values(global.plugins);
  const totalCommands = plugins.reduce(
    (sum, p) => sum + (p.help ? p.help.length : 0),
    0,
  );
  const totalTags = [...new Set(plugins.flatMap((v) => v.tags || []))].length;
  const totalPlugins = plugins.length;

  const text = `
Liora Plugin Statistics

Total Features: ${totalCommands}
Total Categories: ${totalTags}
Total Plugins: ${totalPlugins}
    `.trim();

  await conn.sendMessage(m.chat, { text }, { quoted: m });
};

handler.help = ["totalfitur"];
handler.tags = ["info"];
handler.command = /^(totalfitur)$/i;

export default handler;
