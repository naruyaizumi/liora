import fs from "fs";
import path from "path";

let handler = async (m, { args }) => {
    if (!args.length) args = ["."];
    let target = path.join(...args);
    if (!m.quoted) {
        if (!fs.existsSync(target)) return m.reply(`🍩 *Folder ${target} tidak ada!*`);
        let list = fs
            .readdirSync(target)
            .map((name) => {
                let stats = fs.statSync(path.join(target, name));
                return {
                    name,
                    isDir: stats.isDirectory(),
                };
            })
            .sort((a, b) => {
                if (a.isDir && !b.isDir) return -1;
                if (!a.isDir && b.isDir) return 1;
                return a.name.localeCompare(b.name);
            })
            .map((item) => (item.isDir ? `📁 ${item.name}/` : `📄 ${item.name}`))
            .join("\n");
        return m.reply(`🌸 *Isi Folder: ${target}*\n\n${list}`);
    }
    let filename = m.quoted.fileName || "file.unknown";
    let buffer = await m.quoted.download();
    let fullpath = path.join(target, filename);
    fs.mkdirSync(path.dirname(fullpath), { recursive: true });
    fs.writeFileSync(fullpath, buffer);
    await m.reply(`🍓 *Berhasil disimpan sebagai:*\n📁 *${fullpath}*`);
};

handler.help = ["sf"];
handler.tags = ["owner"];
handler.command = /^(sf|savefile)$/i;
handler.mods = true;

export default handler;
