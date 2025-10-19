let handler = async (m, { conn }) => {
  try {
    await global.loading(m, conn);
    const apiUrl = 'https://api.nekolabs.my.id/random/blue-archive';
    const res = await fetch(apiUrl);
    if (!res.ok) throw new Error(`Status ${res.status}`);

    const buffer = await res.arrayBuffer();
    await conn.sendMessage(m.chat, { image: Buffer.from(buffer), caption: null }, { quoted: m });
  } catch (e) {
    console.error(e);
    await m.reply(`Error: ${e.message || e}`);
  } finally {
    await global.loading(m, conn, true);
  }
};

handler.help = ['bluearchive'];
handler.tags = ['tools'];
handler.command = /^(ba|bluearchive)$/i;

export default handler;