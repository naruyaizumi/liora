import { proto } from "baileys";

export function smsg(conn, m) {
    if (!m) return m;

    const M = proto.WebMessageInfo;
    if (M?.create && typeof M.create === "function") {
        try {
            m = M.create(m);
        } catch (e) {
            conn.logger?.error(e.message);
            return m;
        }
    }

    m.conn = conn;

    try {
        const msg = m.message || null;
        if (!msg) return m;

        if (m.mtype === "protocolMessage" && m.msg?.key) {
            const key = { ...m.msg.key };

            if (key.remoteJid === "status@broadcast" && m.chat) key.remoteJid = m.chat;
            if ((!key.participant || key.participant === "status_me") && m.sender)
                key.participant = m.sender;

            const botId = conn.decodeJid?.(conn.user?.lid || "") || "";
            const partId = conn.decodeJid?.(key.participant) || "";
            key.fromMe = partId === botId;

            if (!key.fromMe && key.remoteJid === botId && m.sender) key.remoteJid = m.sender;

            m.msg.key = key;

            conn.ev?.emit("messages.delete", { keys: [key] });
        }

        if (m.quoted && !m.quoted.mediaMessage && typeof m.quoted.download !== "undefined")
            delete m.quoted.download;
        if (!m.mediaMessage && typeof m.download !== "undefined") delete m.download;
    } catch (e) {
        conn.logger?.error(e.message);
    }

    return m;
}
