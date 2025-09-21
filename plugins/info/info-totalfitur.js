let handler = async (m, { conn }) => {
    let plugins = Object.values(global.plugins);
    let totalHelp = plugins.reduce(
        (sum, plugin) => sum + (plugin.help ? plugin.help.length : 0),
        0
    );
    let totalTags = [...new Set(plugins.flatMap((v) => v.tags || []))].length;
    let totalPlugins = plugins.length;
    await conn.sendMessage(
        m.chat,
        {
            text: `✨ *Statistik Plugin Saya:*\n\n📚 *Total Fitur: ${totalHelp}*\n🏷️ *Total Menu: ${totalTags}*\n📂 *Total Plugin: ${totalPlugins}*`,
        },
        { quoted: m }
    );
};

handler.help = ["totalfitur"];
handler.tags = ["info"];
handler.command = /^(totalfitur)$/i;
handler.owner = true;

export default handler;
