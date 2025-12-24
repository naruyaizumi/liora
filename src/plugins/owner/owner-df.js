import { unlink, access } from "fs/promises";
import path from "path";

let handler = async (m, { args, usedPrefix, command, conn }) => {
    if (!args.length)
        return m.reply(
            `Enter the file path to delete.\n› Example: ${usedPrefix + command} plugins/owner/owner-sf`
        );

    let target = path.join(...args);
    if (!path.extname(target)) target += ".js";
    const filepath = path.resolve(process.cwd(), target);

    try {
        await access(filepath);
        await unlink(filepath);
        m.reply("File deleted successfully.");
    } catch (e) {
        global.logger.error(e);
        if (e.code === "ENOENT") {
            m.reply(`File not found: ${filepath}`);
        } else {
            m.reply(`Error: ${e.message}`);
        }
    }
};

handler.help = ["deletefile"];
handler.tags = ["owner"];
handler.command = /^(df|deletefile)$/i;
handler.owner = true;

export default handler;
