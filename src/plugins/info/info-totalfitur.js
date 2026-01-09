let handler = async (m, { conn }) => {
  const p = Object.values(global.plugins);
  const tc = p.reduce((s, v) => s + (v.help ? v.help.length : 0), 0);
  const tt = [...new Set(p.flatMap(v => v.tags || []))].length;
  const tp = p.length;

  const t = `
Liora Plugin Statistics

Total Features: ${tc}
Total Categories: ${tt}
Total Plugins: ${tp}
`.trim();

  await conn.sendMessage(m.chat, { text: t }, { quoted: m });
};

handler.help = ["totalfitur"];
handler.tags = ["info"];
handler.command = /^(totalfitur)$/i;

export default handler;