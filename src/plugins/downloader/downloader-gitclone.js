/**
 * @file GitHub repository downloader command handler
 * @module plugins/downloader/gitclone
 * @license Apache-2.0
 * @author Naruya Izumi
 */

/**
 * Downloads GitHub repositories as ZIP archives
 * @async
 * @function handler
 * @param {Object} m - Message object
 * @param {Object} sock - Connection object
 * @param {string} text - GitHub repository URL
 * @param {string} usedPrefix - Command prefix used
 * @param {string} command - Command name
 * @returns {Promise<void>}
 *
 * @description
 * Command to download GitHub repositories as ZIP files using GitHub's API.
 * Supports standard GitHub repository URLs and sends the ZIP archive to chat.
 *
 * @features
 * - Downloads GitHub repositories as ZIP archives
 * - Validates GitHub URL format
 * - Extracts user and repository name from URL
 * - Uses GitHub's official ZIP download API
 * - Sends ZIP file with proper mimetype
 */

let handler = async (m, { sock, text, usedPrefix, command }) => {
    try {
        if (!text || !/^https:\/\/github\.com\/[\w-]+\/[\w-]+/i.test(text)) {
            return m.reply(
                `Need GitHub repo URL\nEx: ${usedPrefix + command} https://github.com/user/repo`
            );
        }

        const parts = text.split("/");
        if (parts.length < 5) throw new Error("Invalid GitHub URL");

        await global.loading(m, sock);

        const user = parts[3];
        const repo = parts[4];
        const url = `https://api.github.com/repos/${user}/${repo}/zipball`;
        const file = `${repo}.zip`;

        await sock.sendMessage(
            m.chat,
            {
                document: { url },
                fileName: file,
                mimetype: "application/zip",
            },
            { quoted: m }
        );
    } catch (e) {
        m.reply(`Error: ${e.message}`);
    } finally {
        await global.loading(m, sock, true);
    }
};

/**
 * Command metadata for help system
 * @property {Array<string>} help - Help text
 * @property {Array<string>} tags - Command categories
 * @property {RegExp} command - Command pattern matching
 */
handler.help = ["gitclone"];
handler.tags = ["downloader"];
handler.command = /^(gitclone)$/i;

export default handler;
