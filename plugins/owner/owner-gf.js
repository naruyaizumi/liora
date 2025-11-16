import { join, extname } from "path";

let handler = async (m, { conn, args, usedPrefix, command }) => {
    if (!args.length)
        return m.reply(
            `Enter the target file path.\n› Example: ${usedPrefix + command} plugins/owner/owner-sf`
        );

    try {
        let target = join(...args);
        if (!extname(target)) target += ".js";
        const filepath = join(process.cwd(), target);

        const fileBuffer = Buffer.from(await Bun.file(filepath).arrayBuffer());
        const fileName = target.split("/").pop();

        await conn.sendMessage(
            m.chat,
            {
                document: fileBuffer,
                fileName,
                mimetype: "application/javascript",
            },
            { quoted: m }
        );
    } catch (e) {
        conn.logger.error(e);
        m.reply(`Error: ${e.message}`);
    }
};

handler.help = ["getfile"];
handler.tags = ["owner"];
handler.command = /^(getfile|gf)$/i;
handler.owner = true;

export default handler;
