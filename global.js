import { createRequire } from "module";
import path from "path";
import { fileURLToPath, pathToFileURL } from "url";
import { platform } from "process";
import Database from "better-sqlite3";

global.__filename = function filename(pathURL = import.meta.url, rmPrefix = platform !== "win32") {
    return rmPrefix
        ? /file:\/\/\//.test(pathURL)
            ? fileURLToPath(pathURL)
            : pathURL
        : pathToFileURL(pathURL).toString();
};

global.__dirname = function dirname(pathURL) {
    return path.dirname(global.__filename(pathURL, true));
};

global.__require = function require(dir = import.meta.url) {
    return createRequire(dir);
};

global.API = (name, path = "/", query = {}, apikeyqueryname) =>
    (name in global.config.APIs ? global.config.APIs[name] : name) +
    path +
    (query || apikeyqueryname
        ? "?" +
          new URLSearchParams(
              Object.entries({
                  ...query,
                  ...(apikeyqueryname
                      ? {
                            [apikeyqueryname]:
                                global.config.APIKeys[
                                    name in global.config.APIs ? global.config.APIs[name] : name
                                ],
                        }
                      : {}),
              })
          )
        : "");

global.timestamp = { start: new Date() };

const dbPath = path.join(global.__dirname(import.meta.url), "database.db");
const sqlite = new Database(dbPath);

sqlite.exec(`
CREATE TABLE IF NOT EXISTS store (
  key TEXT PRIMARY KEY,
  value TEXT
);
`);

class data {
    constructor() {
        this.data = {
            users: {},
            chats: {},
            stats: {},
            settings: {},
            bots: {},
        };
    }
    read() {
        const row = sqlite.prepare("SELECT value FROM store WHERE key = ?").get("db");
        if (row) {
            try {
                this.data = JSON.parse(row.value);
            } catch (e) {
                console.error("❌ DB parse error:", e);
            }
        }
    }
    write() {
        sqlite
            .prepare("INSERT OR REPLACE INTO store (key, value) VALUES (?, ?)")
            .run("db", JSON.stringify(this.data));
    }
}

const db = new data();
db.read();
global.db = db;
global.loadDatabase = () => db.read();

global.loading = async (m, conn, back = false) => {
    if (!back) {
        return conn.sendReact(m.chat, "🍥", m.key);
    } else {
        return conn.sendReact(m.chat, "", m.key);
    }
};

global.dfail = (type, m, conn) => {
    let msg = {
        owner: "✨ *Maaf, fitur ini hanya bisa digunakan oleh pemilikku. Silakan tanyakan langsung kepada dia.*",
        mods: "⚙️ *Fitur ini khusus untuk moderator. Jika membutuhkan bantuan, silakan hubungi moderator utama.*",
        group: "🌐 *Perintah ini hanya bisa digunakan di dalam grup. Coba gunakan di grup lain, ya.*",
        admin: "🛡️ *Hanya admin grup yang dapat menggunakan perintah ini.*",
        botAdmin:
            "🤖 *Aku perlu menjadi admin di grup ini agar dapat menjalankan perintah ini. Bisa bantu aku jadi admin?*",
        restrict: "❌ *Maaf, fitur ini telah dibatasi dan tidak dapat digunakan.*",
    }[type];
    if (msg) {
        conn.sendMessage(
            m.chat,
            {
                text: msg,
                contextInfo: {
                    externalAdReply: {
                        title: "🍡 AKSES DITOLAK",
                        body: global.config.watermark,
                        mediaType: 1,
                        thumbnailUrl: "https://qu.ax/RtoXq.jpg",
                        renderLargerThumbnail: true,
                    },
                },
            },
            { quoted: m }
        );
    }
};