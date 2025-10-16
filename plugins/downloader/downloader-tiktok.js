import { fetch } from "liora-lib";

let handler = async (m, { conn, args, usedPrefix, command }) => {
  const url = args[0];
  if (!url)
    return m.reply(
      `Please provide a valid TikTok link.\n› Example: ${usedPrefix + command} https://vt.tiktok.com`
    );
  if (!/^https?:\/\/(www\.)?(vm\.|vt\.|m\.)?tiktok\.com\/.+/i.test(url))
    return m.reply("Invalid URL. Please provide a proper TikTok link.");
  await global.loading(m, conn);
  try {
    const res = await fetch(`https://tikwm.com/api/?url=${encodeURIComponent(url)}`);
    const json = await res.json();
    if (!json?.data) throw new Error("Invalid API response.");
    const data = json.data;
    if (Array.isArray(data.images) && data.images.length) {
      if (data.images.length === 1) {
        await conn.sendMessage(m.chat, { image: { url: data.images[0] } }, { quoted: m });
      } else {
        const album = data.images.map((img, i) => ({
          image: { url: img },
          caption: `Slide ${i + 1} of ${data.images.length}`,
        }));
        await conn.sendAlbum(m.chat, album, { quoted: m });
      }
    } else if (data.play) {
      await conn.sendMessage(
        m.chat,
        { video: { url: data.play }, mimetype: "video/mp4" },
        { quoted: m }
      );
    } else {
      await m.reply("No downloadable media found.");
    }
  } catch (err) {
    console.error(err);
    await m.reply(`Error: ${err.message}`);
  } finally {
    await global.loading(m, conn, true);
  }
};

handler.help = ["tiktok"];
handler.tags = ["downloader"];
handler.command = /^(tiktok|tt)$/i;

export default handler;