import fs from "fs";
let handler = async (m, { conn }) => {
    let sesi = await fs.readFileSync("./database.db");
    return await conn.sendMessage(
        m.chat,
        { document: sesi, mimetype: "application/x-sqlite3", fileName: "database.db" },
        { quoted: m }
    );
};

handler.help = ["getdb"];
handler.tags = ["owner"];
handler.command = /^(getdb)$/i;
handler.mods = true;

export default handler;
