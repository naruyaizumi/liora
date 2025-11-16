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
        const file = Bun.file(filepath);
        const exists = await file.exists();
        if (!exists) throw new Error(`File not found: ${filepath}`);

        await file.delete();
        m.reply("File deleted successfully.");
    } catch (e) {
        conn.logger.error(e);
        m.reply(`Error: ${e.message}`);
    }
};

handler.help = ["deletefile"];
handler.tags = ["owner"];
handler.command = /^(df|deletefile)$/i;
handler.owner = true;

export default handler;
