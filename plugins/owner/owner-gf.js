import { join } from "path";
import { readFileSync, existsSync } from "fs";

let handler = async (m, { conn, args, usedPrefix, command, __dirname }) => {
    if (!args.length)
        return m.reply(
            `🍓 *Masukkan path file plugin yang ingin diambil~*\n\n*Contoh: ${usedPrefix + command} plugins owner owner-delsw*`
        );
    let target = join(...args);
    if (!target.endsWith(".js")) target += ".js";
    let filepath = join(__dirname, "../", target);
    if (!existsSync(filepath)) return m.reply(`🍎 *File "${target}" tidak ditemukan!*`);
    await conn.sendMessage(
        m.chat,
        {
            document: readFileSync(filepath),
            fileName: target.split("/").pop(),
            mimetype: "text/javascript",
            caption: `📂 *Berikut file: ${target}*\n🍡 *Semoga bermanfaat yaa~*`,
        },
        { quoted: m }
    );
};

handler.help = ["getfile"];
handler.tags = ["owner"];
handler.command = /^(getfile|getplugin|gf)$/i;
handler.mods = true;

export default handler;
