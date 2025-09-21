import { createRequire } from "module";
import path from "path";
import { fileURLToPath, pathToFileURL } from "url";
import { platform } from "process";
import yargs from "yargs";
import { JSONFilePreset } from "lowdb/node";

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

global.opts = new Object(yargs(process.argv.slice(2)).exitProcess(false).parse());

const ROOT = global.__dirname(import.meta.url);
const db = await JSONFilePreset(path.join(ROOT, "./database.json"), {
    users: {},
    chats: {},
    stats: {},
    settings: {},
    bots: {},
});
global.db = db;
global.loadDatabase = async function () {
    await db.read();
};
await global.loadDatabase();

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
        premium:
            "💎 *Maaf, fitur ini hanya untuk pengguna premium. Kamu bisa mempertimbangkan untuk meningkatkan aksesmu.*",
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
                        thumbnailUrl: "https://cloudkuimages.guru/uploads/images/WNLivXmV.jpg",
                        renderLargerThumbnail: true,
                    },
                },
            },
            { quoted: m }
        );
    }
};
