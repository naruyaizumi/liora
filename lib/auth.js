import Database from "better-sqlite3"
import path from "path"
import { fileURLToPath } from "url"
import { BufferJSON, initAuthCreds } from "baileys"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DEFAULT_DB = path.join(__dirname, "../auth.db")

export function SQLiteAuth(dbPath = DEFAULT_DB) {
  const db = new Database(dbPath, {
    timeout: 5000,
    fileMustExist: false,
  })

  db.pragma("journal_mode = WAL")
  db.pragma("synchronous = NORMAL")
  db.pragma("temp_store = MEMORY")
  db.pragma("cache_size = -131072")
  db.pragma("mmap_size = 134217728")
  
  db.exec(`
    CREATE TABLE IF NOT EXISTS baileys_state (
      key   TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `)

  const getStmt = db.prepare("SELECT value FROM baileys_state WHERE key = ?")
  const setStmt = db.prepare("INSERT OR REPLACE INTO baileys_state (key, value) VALUES (?, ?)")
  const delStmt = db.prepare("DELETE FROM baileys_state WHERE key = ?")

  const stringify = (obj) => JSON.stringify(obj, BufferJSON.replacer)
  const parse = (str) => {
    try { return JSON.parse(str, BufferJSON.reviver) } catch { return null }
  }

  const existingCredsRow = getStmt.get("creds")
  const creds = existingCredsRow
    ? (parse(existingCredsRow.value) || initAuthCreds())
    : initAuthCreds()

  const keys = {
    async get(type, ids) {
      const out = {}
      for (const id of ids) {
        const k = `${type}-${id}`
        const row = getStmt.get(k)
        out[id] = row ? parse(row.value) : null
      }
      return out
    },
    
    async set(data) {
      const tx = db.transaction(() => {
        for (const type in data) {
          const bucket = data[type]
          for (const id in bucket) {
            const v = bucket[id]
            const k = `${type}-${id}`
            if (v == null) {
              delStmt.run(k)
            } else {
              setStmt.run(k, stringify(v))
            }
          }
        }
      })
      tx()
    },

    async clear() {
      db.exec("DELETE FROM baileys_state WHERE key LIKE '%-%'")
    },
  }

  async function saveCreds() {
    setStmt.run("creds", stringify(creds))
  }

  try {
    db.prepare("SELECT COUNT(*) AS c FROM baileys_state").get()
  } catch {
    db.exec("VACUUM")
  }

  const cleanup = () => {
    try {
      db.prepare("PRAGMA wal_checkpoint(FULL);").run()
      db.prepare("PRAGMA optimize;").run()
      db.close()
    } catch { /* noop */ }
  }
  process.once("exit", cleanup)
  process.once("SIGINT", () => { cleanup(); process.exit(0) })
  process.once("SIGTERM", () => { cleanup(); process.exit(0) })
  
  return { state: { creds, keys }, saveCreds }
}