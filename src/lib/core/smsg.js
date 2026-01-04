import { proto } from "baileys";

export async function smsg(conn, m) {
  if (!m) return m;
  if (m.conn === conn) {
    return m;
  }

  const M = proto.WebMessageInfo;
  if (M?.create && !(m instanceof M)) {
    try {
      m = M.create(m);
    } catch (e) {
      global.logger?.error(e.message);
      return m;
    }
  }

  m.conn = conn;

  const msg = m.message;
  if (!msg) {
    return m;
  }

  if (m.mtype === "protocolMessage" && m.msg?.key) {
    const key = { ...m.msg.key };

    if (key.remoteJid === "status@broadcast" && m.chat) {
      key.remoteJid = m.chat;
    }

    if ((!key.participant || key.participant === "status_me") && m.sender) {
      key.participant = m.sender;
    }

    const botId = conn.decodeJid?.(conn.user?.lid || "") || "";

    if (botId) {
      const partId = conn.decodeJid?.(key.participant) || "";
      key.fromMe = partId === botId;

      if (!key.fromMe && key.remoteJid === botId && m.sender) {
        key.remoteJid = m.sender;
      }
    }

    m.msg.key = key;

    if (conn.ev?.emit) {
      setImmediate(() => {
        conn.ev.emit("messages.delete", { keys: [key] });
      });
    }
  }

  if (m.quoted && !m.quoted.mediaMessage && m.quoted.download !== undefined) {
    delete m.quoted.download;
  }

  if (!m.mediaMessage && m.download !== undefined) {
    delete m.download;
  }

  return m;
}
