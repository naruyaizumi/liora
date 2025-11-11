import { getCoreInstance } from "../../lib/utils/sqlite/database-core.js";
import { Database } from "bun:sqlite";

const SESSION_PATTERNS = {
  VALID_KEYS: [
    /^app-state-sync-key-/,
    /^app-state-sync-version-/,
    /^session-/,
    /^pre-key-/,
    /^sender-key-/,
    /^creds\.update$/,
  ],
  
  TEMP_KEYS: [
    /^message-retry-/,
    /^msg-/,
    /^receipt-/,
  ],
};

class SessionCleaner {
  constructor(dbPath = "./database/auth.db", logger = null) {
    this.dbPath = dbPath;
    this.logger = logger || console;
    this.stats = {
      total: 0,
      cleaned: 0,
      corrupted: 0,
      duplicates: 0,
      expired: 0,
      temp: 0,
      optimized: 0,
      errors: [],
    };
  }

  async clean() {
    let db;
    try {
      db = new Database(this.dbPath, { readwrite: true });

      const allKeys = db.query("SELECT key, value FROM baileys_state").all();
      this.stats.total = allKeys.length;

      const toDelete = new Set();
      const validKeys = new Map();

      for (const { key, value } of allKeys) {
        if (SESSION_PATTERNS.TEMP_KEYS.some(pattern => pattern.test(key))) {
          toDelete.add(key);
          this.stats.temp++;
          continue;
        }

        if (!value || value.length === 0) {
          toDelete.add(key);
          this.stats.corrupted++;
          continue;
        }

        const buffer = Buffer.from(value);
        if (key.startsWith("app-state-sync-key-") && buffer.length < 32) {
          toDelete.add(key);
          this.stats.corrupted++;
          continue;
        }

        if (key.startsWith("pre-key-") && buffer.length < 10) {
          toDelete.add(key);
          this.stats.corrupted++;
          continue;
        }

        if (this._isExpired(key)) {
          toDelete.add(key);
          this.stats.expired++;
          continue;
        }

        const normalized = this._normalizeKey(key);
        if (validKeys.has(normalized) && validKeys.get(normalized) !== key) {
          toDelete.add(key);
          this.stats.duplicates++;
          continue;
        }
        validKeys.set(normalized, key);

        const fixed = this._tryFixValue(buffer);
        if (fixed.length !== buffer.length) {
          db.query("UPDATE baileys_state SET value = ? WHERE key = ?").run(fixed, key);
          this.stats.optimized++;
        }
      }

      if (toDelete.size > 0) {
        const deleteStmt = db.query("DELETE FROM baileys_state WHERE key = ?");
        const deleteTx = db.transaction((keys) => {
          for (const key of keys) {
            deleteStmt.run(key);
          }
        });
        
        deleteTx(Array.from(toDelete));
        this.stats.cleaned = toDelete.size;
      }

      return this.stats;
    } catch (e) {
      this.logger.error({ err: e.message, context: "clean" });
      throw e;
    } finally {
      if (db) db.close();
    }
  }

  async refresh() {
    let db;
    try {
      const core = getCoreInstance(this.dbPath);
      await core.flush();

      db = new Database(this.dbPath, { readwrite: true });
      
      db.exec("PRAGMA wal_checkpoint(TRUNCATE)");
      db.exec("PRAGMA incremental_vacuum");
      db.exec("PRAGMA optimize");
      
      try {
        db.exec("REINDEX idx_key_prefix");
      } catch (e) {
        //
      }
      
      db.exec("ANALYZE baileys_state");
      
      return true;
    } catch (e) {
      this.logger.error({ err: e.message, context: "refresh" });
      throw e;
    } finally {
      if (db) db.close();
    }
  }

  _isExpired(key) {
    if (key.startsWith("message-retry-") || key.startsWith("msg-")) {
      const parts = key.split("-");
      const timestamp = parseInt(parts[parts.length - 1]);
      if (!isNaN(timestamp) && timestamp > 1000000000) {
        const age = Date.now() - (timestamp * 1000);
        return age > 7 * 24 * 60 * 60 * 1000;
      }
    }
    
    if (key.startsWith("receipt-")) {
      const parts = key.split("-");
      const timestamp = parseInt(parts[parts.length - 1]);
      if (!isNaN(timestamp) && timestamp > 1000000000) {
        const age = Date.now() - (timestamp * 1000);
        return age > 3 * 24 * 60 * 60 * 1000;
      }
    }
    
    return false;
  }

  _normalizeKey(key) {
    return key.toLowerCase().trim();
  }

  _tryFixValue(buffer) {
    let end = buffer.length;
    while (end > 0 && buffer[end - 1] === 0) {
      end--;
    }
    return buffer.subarray(0, end);
  }
}

let handler = async (m, { conn }) => {
  try {
    await global.loading(m, conn);

    const cleaner = new SessionCleaner("./database/auth.db", conn.logger);
    
    const cleanStats = await cleaner.clean();
    await cleaner.refresh();

    let report = "Session Fix Complete\n\n";
    report += `Total Keys: ${cleanStats.total}\n`;
    report += `Cleaned: ${cleanStats.cleaned}\n`;
    report += `- Corrupted: ${cleanStats.corrupted}\n`;
    report += `- Duplicates: ${cleanStats.duplicates}\n`;
    report += `- Expired: ${cleanStats.expired}\n`;
    report += `- Temp Keys: ${cleanStats.temp}\n`;
    report += `Optimized: ${cleanStats.optimized}\n`;

    if (cleanStats.errors.length > 0) {
      report += `\nErrors: ${cleanStats.errors.length}`;
    }

    await conn.sendMessage(m.chat, { text: report }, { quoted: m });

  } catch (e) {
    conn.logger.error(e);
    return m.reply(`Error: ${e.message}`);
  } finally {
    await global.loading(m, conn, true);
  }
};

handler.help = ["fix"];
handler.tags = ["owner"];
handler.command = /^(fix)$/i;
handler.owner = true;

export default handler;