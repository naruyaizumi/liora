let handler = async (m, { conn }) => {
    const plugins = Object.values(global.plugins);
    const totalCommands = plugins.reduce((sum, p) => sum + (p.help ? p.help.length : 0), 0);
    const totalTags = [...new Set(plugins.flatMap((v) => v.tags || []))].length;
    const totalPlugins = plugins.length;
    const timestamp = new Date().toTimeString().split(" ")[0];

    const text = [
        "```",
        `[${timestamp}] Liora Plugin Statistics`,
        "────────────────────────────",
        `Total Features  : ${totalCommands}`,
        `Total Categories: ${totalTags}`,
        `Total Plugins   : ${totalPlugins}`,
        "```",
    ].join("\n");

    await conn.sendMessage(m.chat, { text }, { quoted: m });
};

handler.help = ["totalfitur"];
handler.tags = ["info"];
handler.command = /^(totalfitur)$/i;

export default handler;
