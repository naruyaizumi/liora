import { join, extname } from "path";
import { readFileSync, existsSync } from "fs";

let handler = async (m, { conn, args, usedPrefix, command, __dirname }) => {
    if (!args.length)
        return m.reply(
            `🍓 *Masukkan path file yang ingin diambil~*\n\n*Contoh:* ${usedPrefix + command} plugins owner owner-delsw\n*Contoh:* ${usedPrefix + command} package.json`
        );

    let target = join(...args);
    if (!extname(target)) target += ".js";

    let filepath = join(__dirname, "../", target);
    if (!existsSync(filepath)) return m.reply(`🍎 *File "${target}" tidak ditemukan!*`);

    await conn.sendMessage(
        m.chat,
        {
            document: readFileSync(filepath),
            fileName: target.split("/").pop(),
            mimetype: "application/octet-stream",
            caption: `📂 *Berikut file: ${target}* 🍡`,
        },
        { quoted: m }
    );
};

handler.help = ["getfile <path>"];
handler.tags = ["owner"];
handler.command = /^(getfile|getplugin|gf)$/i;
handler.mods = true;

export default handler;
