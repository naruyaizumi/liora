let handler = async (m, { conn, text, usedPrefix, command }) => {
  if (!text)
    return m.reply(
      `Usage: ${usedPrefix + command} <query>\n› Example: ${usedPrefix + command} linux`
    );

  try {
    await global.loading(m, conn);

    const apiUrl = global.API("btz", "/api/search/wikimedia", { text1: text }, "apikey");
    const response = await fetch(apiUrl);
    if (!response.ok) throw new Error(`API Error: ${response.status} - ${response.statusText}`);

    const json = await response.json();
    if (!json.result || json.result.length === 0)
      return m.reply(`No results found for "${text}".`);

    const limited = json.result.slice(0, 20);
    const album = limited.map((item, i) => ({
      image: { url: item.image },
      caption: `Result ${i + 1}/${limited.length}`,
    }));

    await conn.sendAlbum(m.chat, album, { quoted: m });
  } catch (error) {
    console.error(error);
    m.reply("Error: Failed to retrieve data from Wikimedia.");
  } finally {
    await global.loading(m, conn, true);
  }
};

handler.help = ["wikimedia"];
handler.tags = ["internet"];
handler.command = /^(wikimedia)$/i;

export default handler;