import { fetch } from "liora-lib";

let handler = async (m, { conn, args, usedPrefix, command }) => {
  if (args.length < 2) {
    return m.reply(`Enter display mode and URL.
Example: ${usedPrefix + command} 1 https://example.com
Available modes:
1. Desktop
2. Tablet
3. Mobile`);
  }

  const mode = args[0];
  const url = args.slice(1).join(" ");
  const devices = { 1: "desktop", 2: "tablet", 3: "phone" };

  if (!devices[mode]) {
    return m.reply("Invalid mode. Choose 1 (Desktop), 2 (Tablet), or 3 (Mobile).");
  }

  await global.loading(m, conn);

  try {
    const device = devices[mode];
    const res = await fetch(global.API("btz", "/api/tools/ssweb", { url, device }, "apikey"));
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const buffer = Buffer.from(await res.arrayBuffer());

    const caption = `
Screenshot (${device.toUpperCase()})
URL: ${url}
Mode: ${device}
`.trim();

    await conn.sendMessage(m.chat, { image: buffer, caption }, { quoted: m });
  } catch (e) {
    conn.logger.error(e);
    m.reply(`Error: ${e.message}`);
  } finally {
    await global.loading(m, conn, true);
  }
};

handler.help = ["ssweb"];
handler.tags = ["tools"];
handler.command = /^(ssweb)$/i;

export default handler;