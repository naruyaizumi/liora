export async function doBroadcast(conn, cc, teks, groups, { ht = false } = {}) {
  let success = 0;
  let failed = 0;

  for (const id of groups) {
    try {
      const type = cc.mtype || "";
      const content = cc.msg || {};
      let buffer = null;

      try {
        buffer = await cc.download?.();
      } catch (err) {
        console.error("[DOWNLOAD ERROR]:", err);
        buffer = null;
      }

      if (type === "imageMessage" && buffer) {
        await conn.sendMessage(id, {
          image: buffer,
          caption: teks || content.caption || "",
        });
      } else if (type === "videoMessage" && buffer) {
        await conn.sendMessage(id, {
          video: buffer,
          caption: teks || content.caption || "",
        });
      } else if (type === "audioMessage" && buffer) {
        const isPTT = content.ptt === true;
        await conn.sendMessage(id, {
          audio: buffer,
          ptt: isPTT,
          mimetype:
            content.mimetype ||
            (isPTT ? "audio/ogg; codecs=opus" : "audio/mpeg"),
        });
      } else {
        const extra = {};
        if (ht) {
          const meta = await conn.groupMetadata(id).catch(() => null);
          if (meta) extra.mentions = meta.participants.map((p) => p.id);
        }
        const finalText =
          teks || content.text || content.caption || "Broadcast without text";
        await conn.sendMessage(id, { text: finalText, ...extra });
      }

      success++;
      await delay();
    } catch (err) {
      console.error(`[ERROR BROADCAST ${id}]:`, err);
      failed++;
    }
  }

  return { success, failed };
}

function delay() {
  return new Promise((resolve) => setTimeout(resolve, 3000));
}
