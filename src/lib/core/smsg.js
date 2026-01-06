import { proto } from "baileys";
import { Message } from "./message.js";

const messageCache = new WeakMap();

export function smsg(conn, m) {
  if (!m) return m;

  let cached = messageCache.get(m);
  if (cached) {
    if (cached.conn !== conn) {
      cached.conn = conn;
    }
    return cached;
  }

  const M = proto.WebMessageInfo;
  let raw = m;

  if (M?.create) {
    try {
      raw = M.create(m);
    } catch (e) {
      if (global.logger?.error) {
        global.logger.error(e.message);
      }
      raw = m;
    }
  }

  const wrapped = new Message(raw, conn);

  try {
    wrapped.process();
  } catch (e) {
    if (global.logger?.error) {
      global.logger.error({ error: e.message }, "Process message error");
    }
  }

  messageCache.set(m, wrapped);
  if (raw !== m) {
    messageCache.set(raw, wrapped);
  }

  return wrapped;
}
