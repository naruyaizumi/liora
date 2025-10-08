import { join, extname } from "path";
import { open } from "fs/promises";

let handler = async (m, { conn, args, usedPrefix, command, __dirname }) => {
    const time = new Date().toTimeString().split(" ")[0];

    if (!args.length)
        return m.reply(
            `Enter the target file path.\n` +
                `› Example: ${usedPrefix + command} plugins owner owner-sf\n` +
                `› Example: ${usedPrefix + command} package.json`
        );

    try {
        let target = join(...args);
        if (!extname(target)) target += ".js";

        const filepath = join(__dirname, "../", target);
        const handle = await open(filepath, "r");
        const fileBuffer = await handle.readFile();
        await handle.close();

        const fileName = target.split("/").pop();
        const fileSize = (fileBuffer.length / 1024).toFixed(2);

        const caption = [
            "```",
            `Time : ${time}`,
            `Path : ${target}`,
            `Name : ${fileName}`,
            `Size : ${fileSize} KB`,
            "───────────────────────────",
            "File successfully sent.",
            "```",
        ].join("\n");

        await conn.sendMessage(
            m.chat,
            {
                document: fileBuffer,
                fileName,
                mimetype: "application/octet-stream",
                caption,
            },
            { quoted: m }
        );
    } catch (err) {
        m.reply(`Error: ${err.message}`);
    }
};

handler.help = ["getfile"];
handler.tags = ["owner"];
handler.command = /^(getfile|gf)$/i;
handler.mods = true;

export default handler;
