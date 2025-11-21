import { proto } from "baileys";

const SYM_PROCESSED = Symbol.for("smsg.processed");
const SYM_CONN = Symbol.for("smsg.conn");

let cachedBotId = null;
let cachedBotIdTime = 0;
const BOT_ID_CACHE_TTL = 300000;

export function smsg(conn, m) {
    if (!m) return m;
    if (m[SYM_PROCESSED]) {
        if (m[SYM_CONN] !== conn) {
            m.conn = conn;
            m[SYM_CONN] = conn;
        }
        return m;
    }
    const M = proto.WebMessageInfo;
    if (M?.create) {
        try {
            m = M.create(m);
        } catch (e) {
            conn.logger.error(e.message);
            return m;
        }
    }
    m.conn = conn;
    m[SYM_CONN] = conn;
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

            const now = Date.now();
            if (!cachedBotId || now - cachedBotIdTime > BOT_ID_CACHE_TTL) {
                cachedBotId = conn.decodeJid?.(conn.user?.lid || "") || "";
                cachedBotIdTime = now;
            }

            if (cachedBotId) {
                const partId = conn.decodeJid?.(key.participant) || "";
                key.fromMe = partId === cachedBotId;

                if (!key.fromMe && key.remoteJid === cachedBotId && m.sender) {
                    key.remoteJid = m.sender;
                }
            }

            m.msg.key = key;
            conn.ev?.emit("messages.delete", { keys: [key] });
        }

        if (m.quoted && !m.quoted.mediaMessage && m.quoted.download !== undefined) {
            delete m.quoted.download;
        }
        if (!m.mediaMessage && m.download !== undefined) {
            delete m.download;
        }
    } catch (e) {
        conn.logger.error(e.message);
    }

    m[SYM_PROCESSED] = true;

    return m;
}
