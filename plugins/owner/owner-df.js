import fs from "fs";
import path from "path";

let handler = async (m, { args, usedPrefix, command }) => {
    if (!args.length)
        return m.reply(
            `🍓 *Masukkan path file/folder yang mau dihapus~*\n*Contoh: ${usedPrefix + command} plugins owner owner-delsw*`
        );
    let target = path.join(...args);
    if (!path.extname(target)) target += ".js";
    if (!fs.existsSync(target)) return m.reply(`🍩 *File/Folder ${target} tidak ada!*`);
    if (fs.statSync(target).isDirectory()) {
        fs.rmSync(target, { recursive: true, force: true });
        return m.reply(`📁 *Folder berhasil dihapus: ${target}*`);
    }
    fs.unlinkSync(target);
    return m.reply(`📄 *File berhasil dihapus: ${target}*`);
};

handler.help = ["df <path>"];
handler.tags = ["owner"];
handler.command = /^(df|deletefile)$/i;
handler.mods = true;

export default handler;
