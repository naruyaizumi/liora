import fs from "fs/promises";
import path from "path";

let handler = async (m, { args, usedPrefix, command, conn }) => {
    if (!args.length)
        return m.reply(
            `Enter the file or folder path to delete.\n` +
                `› Example: ${usedPrefix + command} plugins owner owner-sf`
        );

    let target = path.join(...args);
    if (!path.extname(target)) target += ".js";

    try {
        await fs.access(target).catch(() => {
            throw new Error(`File or folder not found: ${target}`);
        });

        const stat = await fs.stat(target);
        const isDir = stat.isDirectory();

        if (isDir) {
            await fs.rm(target, { recursive: true, force: true });
        } else {
            await fs.unlink(target);
        }

        m.reply("Operation completed successfully.");
    } catch (e) {
        conn.logger.error(e);
        m.reply(`Error: ${e.message}`);
    }
};

handler.help = ["deletefile"];
handler.tags = ["owner"];
handler.command = /^(df|deletefile)$/i;
handler.mods = true;

export default handler;