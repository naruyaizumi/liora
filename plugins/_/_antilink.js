const linkRegex = /\b((https?|ftp):\/\/[^\s]+|www\.[^\s]+)/gi;

export async function before(m, { conn }) {
  const toJid = (n) => {
    const raw = Array.isArray(n) ? n[0] : (n?.num ?? n?.lid ?? n);
    const digits = String(raw ?? "").replace(/[^0-9]/g, "");
    return digits ? digits + "@s.whatsapp.net" : "";
  };

  const resolveOwners = async (conn, owners = []) => {
    if (!conn?.lidMappingStore) {
      return owners
        .map((entry) =>
          toJid(Array.isArray(entry) ? entry[0] : (entry?.num ?? entry?.lid ?? entry))
        )
        .filter(Boolean);
    }
    const cache = conn.lidMappingStore.cache;
    const out = new Set();
    for (const entry of owners) {
      const num = Array.isArray(entry) ? entry[0] : (entry?.num ?? entry?.lid ?? entry);
      const jid = toJid(num);
      if (!jid) continue;
      out.add(jid);
      let lid = cache?.get(jid);
      if (!lid) {
        try {
          lid = await conn.lidMappingStore.getLIDForPN(jid);
        } catch {}
      }
      if (lid) {
        out.add(lid);
        try {
          cache?.set(jid, lid);
          cache?.set(lid, jid);
        } catch {}
      }
      if (lid) {
        let back = cache?.get(lid);
        if (!back) {
          try {
            back = await conn.lidMappingStore.getPNForLID(lid);
          } catch {}
        }
        if (back) {
          out.add(back);
          try {
            cache?.set(lid, back);
            cache?.set(back, lid);
          } catch {}
        }
      }
    }
    return [...out];
  };

  const devOwners = global.config.owner.filter(([n, , isDev]) => n && isDev);
  const regOwners = global.config.owner.filter(([n, , isDev]) => n && !isDev);
  const devList = await resolveOwners(conn, devOwners);
  const regList = await resolveOwners(conn, regOwners);
  const isMods = devList.includes(m.sender);
  const isOwner = m.fromMe || isMods || regList.includes(m.sender);

  if (m.isBaileys || m.fromMe) return true;
  if (isOwner || isMods) return true;
  if (!m.isGroup) return true;

  const groupMetadata =
    (m.isGroup ? conn.chats?.[m.chat]?.metadata || (await conn.groupMetadata(m.chat)) : {}) || {};
  const participants = m.isGroup ? groupMetadata.participants || [] : [];
  const senderId = conn.decodeJid(m.sender);
  const botId = conn.decodeJid(conn.user.id);
  const user =
    participants.find(
      (u) => conn.decodeJid(u.lid) === senderId || conn.decodeJid(u.id) === senderId
    ) || {};
  const bot =
    participants.find(
      (u) => conn.decodeJid(u.lid) === botId || conn.decodeJid(u.id) === botId
    ) || {};
  const isAdmin = user?.admin === "admin" || user?.admin === "superadmin";
  const isBotAdmin = bot?.admin === "admin" || bot?.admin === "superadmin";

  if (isAdmin) return true;
  const chat = global.db.data.chats[m.chat];
  if (!chat?.antiLinks || !isBotAdmin) return true;

  const text =
    m.text ||
    m.message?.conversation ||
    m.message?.extendedTextMessage?.text ||
    m.message?.imageMessage?.caption ||
    m.message?.videoMessage?.caption ||
    m.message?.documentMessage?.caption ||
    m.message?.buttonsResponseMessage?.selectedButtonId ||
    m.message?.listResponseMessage?.singleSelectReply?.selectedRowId ||
    "";
  if (!text) return true;

  const matches = [...text.matchAll(linkRegex)];
  const validLinks = matches.filter(([url]) => {
    const lower = url.toLowerCase();
    return (
      lower.startsWith("http://") ||
      lower.startsWith("https://") ||
      lower.startsWith("ftp://") ||
      lower.startsWith("www.")
    );
  });

  if (validLinks.length > 0) {
    try {
      await conn.sendMessage(m.chat, {
        delete: {
          remoteJid: m.chat,
          fromMe: false,
          id: m.key.id,
          participant: m.key.participant || m.sender,
        },
      });
    } catch (e) {
      conn.logger.error(e);
    }
  }

  return true;
}