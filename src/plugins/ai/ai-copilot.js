let handler = async (m, { conn, text }) => {
  if (!text) return m.reply("Ask something to Copilot AI");

  try {
    await global.loading(m, conn);

    const api = `https://api.nekolabs.web.id/text-generation/copilot?text=${encodeURIComponent(text)}`;
    const res = await fetch(api);
    if (!res.ok) return m.reply("API error");

    const json = await res.json();
    const reply = json?.result?.text;

    if (!reply) return m.reply("No response");

    await conn.sendMessage(
      m.chat,
      { text: `Copilot:\n${reply.trim()}` },
      { quoted: m },
    );
  } catch (e) {
    m.reply(`Error: ${e.message}`);
  } finally {
    await global.loading(m, conn, true);
  }
};

handler.help = ["copilot"];
handler.tags = ["ai"];
handler.command = /^(copilot)$/i;

export default handler;