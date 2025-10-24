let handler = async (m, { conn, text, usedPrefix, command }) => {
    try {
        if (!text || !/^https:\/\/github\.com\/[\w-]+\/[\w-]+/i.test(text))
            return m.reply(
                `Please provide a valid GitHub repository URL.\n› Example: ${usedPrefix + command} https://github.com/username/repo`
            );

        const parts = text.split("/");
        if (parts.length < 5) return m.reply("Incomplete GitHub repository URL.");

        await global.loading(m, conn);

        const user = parts[3];
        const repo = parts[4];
        const url = `https://api.github.com/repos/${user}/${repo}/zipball`;
        const filename = `${repo}.zip`;

        await conn.sendMessage(
            m.chat,
            {
                document: { url },
                fileName: filename,
                mimetype: "application/zip",
            },
            { quoted: m }
        );
    } catch (e) {
        conn.logger.error(e);
        m.reply(`Error: ${e.message}`);
    } finally {
        await global.loading(m, conn, true);
    }
};

handler.help = ["gitclone"];
handler.tags = ["downloader"];
handler.command = /^(gitclone)$/i;

export default handler;
