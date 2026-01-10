/**
 * @file Save file and directory listing command handler
 * @module plugins/owner/savefile
 * @license Apache-2.0
 * @author Naruya Izumi
 */

/**
 * Lists directory contents or saves files to the file system
 * @async
 * @function handler
 * @param {Object} m - Message object
 * @param {Object} param1 - Destructured parameters
 * @param {Array} param1.args - Directory path arguments
 * @returns {Promise<void>}
 *
 * @description
 * Dual-purpose command that either lists directory contents or saves files.
 * Without a quoted message: lists files and directories at specified path.
 * With a quoted media/document: saves the file to specified path.
 *
 * @features
 * - Lists directory contents with file/folder icons
 * - Saves media and documents to file system
 * - Handles various file types (image, video, audio, documents)
 * - Creates directories recursively if needed
 * - Shows relative paths for saved files
 * - Only accessible by bot owner
 */

import { readdir, mkdir } from "node:fs/promises";
import path from "node:path";

const handler = async (m, { args }) => {
    try {
        let t = args.length ? path.join(process.cwd(), ...args) : process.cwd();
        t = path.resolve(t);

        if (!m.quoted) {
            const items = await readdir(t, { withFileTypes: true }).catch(() => null);
            if (!items) return m.reply(`Folder not found: ${t}`);

            const list =
                items
                    .sort((a, b) =>
                        a.isDirectory() === b.isDirectory()
                            ? a.name.localeCompare(b.name)
                            : a.isDirectory()
                              ? -1
                              : 1
                    )
                    .map(
                        (i) =>
                            `${i.isDirectory() ? "📁" : "📄"} ${i.name}${i.isDirectory() ? "/" : ""}`
                    )
                    .join("\n") || "(empty)";
            return m.reply(`Path: ${t}\n\n${list}`);
        }

        const q = m.quoted;
        const mime = q.mimetype || q.mediaType || "";
        if (!q?.download || !/^(image|video|audio|application)/.test(mime)) {
            return m.reply("Need media or document");
        }

        const buf = await q.download().catch(() => null);
        if (!buf?.length) return m.reply("Download failed");

        const ext = mime?.split("/")[1] || path.extname(q.fileName || "")?.slice(1) || "bin";
        const name = q.fileName ? path.basename(q.fileName) : `file-${Date.now()}.${ext}`;
        const fp = path.resolve(t, name);
        await mkdir(path.dirname(fp), { recursive: true });
        await Bun.write(fp, buf);
        return m.reply(`Saved: ${path.relative(process.cwd(), fp)}`);
    } catch (e) {
        return m.reply(`Error: ${e.message}`);
    }
};

/**
 * Command metadata for help system
 * @property {Array<string>} help - Help text
 * @property {Array<string>} tags - Command categories
 * @property {RegExp} command - Command pattern matching
 * @property {boolean} owner - Whether only bot owner can use this command
 */
handler.help = ["sf"];
handler.tags = ["owner"];
handler.command = /^(sf|savefile)$/i;
handler.owner = true;

export default handler;
