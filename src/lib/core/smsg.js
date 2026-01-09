import { proto } from "baileys";

const SYM_PROCESSED = Symbol.for("smsg.processed");

export function smsg(conn, m) {
    if (!m) return m;
    if (m[SYM_PROCESSED]) {
        m.conn = conn;
        return m;
    }
    
    const M = proto.WebMessageInfo;
    if (M?.create) {
        try {
            m = M.create(m);
        } catch (e) {
            throw e;
        }
    }
    
    m.conn = conn;
    
    const msg = m.message;
    if (!msg) {
        m[SYM_PROCESSED] = true;
        return m;
    }

    try {
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
            conn.ev?.emit("messages.delete", { keys: [key] });
        }
    } catch (e) {
        throw e;
    }

    m[SYM_PROCESSED] = true;
    return m;
}