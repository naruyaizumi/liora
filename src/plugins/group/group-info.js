let handler = async (m, { conn }) => {
  try {
    await global.loading(m, conn);

    let meta;
    try {
      const chatData = await conn.getChat(m.chat);
      if (chatData?.metadata?.participants?.length) {
        meta = chatData.metadata;
      }
    } catch {
      //
    }

    if (!meta) {
      try {
        meta = await conn.groupMetadata(m.chat);
        try {
          const chatData = (await conn.getChat(m.chat)) || { id: m.chat };
          chatData.metadata = meta;
          chatData.subject = meta.subject;
          chatData.isChats = true;
          chatData.lastSync = Date.now();
          await conn.setChat(m.chat, chatData);
        } catch {
          //
        }
      } catch (e) {
        return m.reply(`Failed: ${e.message || "Unknown"}`);
      }
    }

    const members = meta.participants || [];
    const admins = members.filter(p => p.admin);
    const owner = meta.owner ||
      admins.find(p => p.admin === "superadmin")?.id ||
      m.chat.split`-`[0] + "@s.whatsapp.net";

    const adminList = admins.map((v, i) => `${i + 1}. @${v.id.split("@")[0]}`).join("\n") || "-";

    const ephemeralTime = {
      86400: "24h",
      604800: "7d",
      2592000: "30d",
      7776000: "90d"
    }[meta.ephemeralDuration] || "None";

    const creationDate = meta.creation
      ? new Date(meta.creation * 1000).toLocaleString("en-US", {
          timeZone: "UTC",
          dateStyle: "medium",
          timeStyle: "short",
        })
      : "(unknown)";

    const desc = meta.desc || "(none)";
    let pp = null;
    try {
      pp = await conn.profilePictureUrl(m.chat, "image");
    } catch {
      //
    }

    const mentions = [...new Set([...admins.map(v => v.id), owner])];

    const txt = `
Group Info

ID: ${m.chat}
Name: ${meta.subject || "(unknown)"}
Members: ${members.length}
Owner: @${owner.split("@")[0]}

Admins:
${adminList}

Desc:
${desc}

Created: ${creationDate}
Ephemeral: ${ephemeralTime}
Announce: ${meta.announce ? "Yes" : "No"}
`.trim();

    if (pp) {
      await conn.sendMessage(m.chat, {
        image: { url: pp },
        caption: txt,
        mentions,
      });
    } else {
      await conn.sendMessage(m.chat, {
        text: txt,
        mentions,
      });
    }
  } catch (e) {
    m.reply(`Error: ${e.message}`);
  } finally {
    await global.loading(m, conn, true);
  }
};

handler.help = ["groupinfo"];
handler.tags = ["group"];
handler.command = /^(info(gro?up|gc))$/i;
handler.group = true;
handler.admin = true;

export default handler;