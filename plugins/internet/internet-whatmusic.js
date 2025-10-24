import { uploader } from "../../lib/uploader.js";
import { fetch } from "liora-lib";

let handler = async (m, { conn, usedPrefix, command }) => {
  try {
    const q = m.quoted || null;
    if (!q) {
      return m.reply(`Example: ${usedPrefix + command}`);
    }

    await global.loading(m, conn);

    const media = await q.download().catch(() => null);
    if (!media || !media.length) return m.reply("Failed to download the media file.");

    const url = await uploader(media).catch(() => null);
    if (!url) return m.reply("Failed to upload the media to the server.");

    const api = global.API("btz", "/api/tools/whatmusic", { url }, "apikey");
    const res = await fetch(api);
    if (!res.ok) throw new Error(`HTTP ${res.status}: Failed to reach BetaBotz service.`);

    const json = await res.json();
    const data = json.result;
    if (!json.status || !data || typeof data !== "object") {
      return m.reply("No matching song found for the provided clip.");
    }

    const result = `
Whatmusic Detector
Title: ${data.title || "-"}
Artist: ${data.artist || "-"}
Album: ${data.album || "-"}
Release: ${data.release_date || "-"}
Label: ${data.label || "-"}
Genre: ${data.genre || "-"}
Duration: ${data.duration || "-"}
Confidence: ${data.confidence || "-"}
${data.url ? `Link: ${data.url}` : ""}
`.trim();

    await conn.sendMessage(m.chat, { text: result }, { quoted: m });
  } catch (e) {
    conn.logger.error(e);
    await m.reply(`Error: ${e.message}`);
  } finally {
    await global.loading(m, conn, true);
  }
};

handler.help = ["whatmusic"];
handler.tags = ["internet"];
handler.command = /^(whatmusic|judul)$/i;

export default handler;