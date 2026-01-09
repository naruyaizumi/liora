import {
  uploader1, uploader2, uploader3, uploader4, uploader5,
  uploader6, uploader7, uploader
} from "#lib/uploader.js";

const servers = {
  1: { name: "Catbox.moe", fn: uploader1 },
  2: { name: "Uguu.se", fn: uploader2 },
  3: { name: "Qu.ax", fn: uploader3 },
  4: { name: "Put.icu", fn: uploader4 },
  5: { name: "Tmpfiles.org", fn: uploader5 },
  6: { name: "Videy", fn: uploader6 },
  7: { name: "GoFile", fn: uploader7 },
};

let handler = async (m, { conn, args, usedPrefix, command }) => {
  const q = m.quoted?.mimetype ? m.quoted : m;
  const mime = (q.msg || q).mimetype || q.mediaType || "";

  if (!args[0]) {
    if (!mime) {
      const list = `*Upload Server*\n
1. Catbox.moe
2. Uguu.se
3. Qu.ax
4. Put.icu
5. Tmpfiles.org
6. Videy (Video only)
7. GoFile (Image only)

Ex: ${usedPrefix + command} 1`;
      return m.reply(list);
    }

    await global.loading(m, conn);
    const buffer = await q.download?.();

    const sizeKB = (buffer.length / 1024).toFixed(2);
    const sizeMB = (buffer.length / 1024 / 1024).toFixed(2);
    const size = buffer.length > 1024 * 1024 ? `${sizeMB} MB` : `${sizeKB} KB`;

    const res = await uploader(buffer);
    if (res?.success) {
      return conn.client(
        m.chat,
        {
          text: `Uploaded\nServer: ${res.provider}\nSize: ${size}`,
          interactiveButtons: [
            {
              name: "cta_copy",
              buttonParamsJson: JSON.stringify({
                display_text: "Copy URL",
                copy_code: res.url,
              }),
            },
          ],
        },
        { quoted: m },
      );
    }
    return m.reply(`Upload failed.\nSize: ${size}`);
  }

  const num = args[0].toString().trim().match(/\d+/)?.[0];
  if (!num || !servers[num]) return m.reply("Invalid server (1-7)");

  await global.loading(m, conn);
  const buffer = await q.download?.();

  const sizeKB = (buffer.length / 1024).toFixed(2);
  const sizeMB = (buffer.length / 1024 / 1024).toFixed(2);
  const size = buffer.length > 1024 * 1024 ? `${sizeMB} MB` : `${sizeKB} KB`;

  const srv = servers[num];
  let result = await srv.fn(buffer);
  let caption = "";
  let url = "";

  if (!result) {
    await m.reply(`${srv.name} failed. Trying fallback...`);
    result = await uploader(buffer);
    if (result?.success) {
      caption = `Uploaded\nPrimary: ${srv.name} (failed)\nFallback: ${result.provider}\nSize: ${size}`;
      url = result.url;
    }
  } else if (result.success) {
    caption = `Uploaded\nServer: ${result.provider}\nSize: ${size}`;
    url = result.url;
  } else if (typeof result === "string") {
    caption = `Uploaded\nServer: ${srv.name}\nSize: ${size}`;
    url = result;
  } else {
    return m.reply(`Upload failed.\nSize: ${size}`);
  }

  return conn.client(
    m.chat,
    {
      text: caption,
      interactiveButtons: [
        {
          name: "cta_copy",
          buttonParamsJson: JSON.stringify({
            display_text: "Copy URL",
            copy_code: url,
          }),
        },
      ],
    },
    { quoted: m },
  );
};

handler.help = ["upload"];
handler.tags = ["tools"];
handler.command = /^(tourl|url|upload)$/i;

export default handler;