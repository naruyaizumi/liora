/**
 * @file File manager command handler
 * @module plugins/owner/file
 * @license Apache-2.0
 * @author Naruya Izumi
 */

import { readdir, mkdir } from "node:fs/promises";
import { join, resolve, extname, basename, dirname, relative } from "node:path";

let handler = async (m, { sock, args, usedPrefix, command }) => {
    if (!args.length) return m.reply(`*File Manager*

*Usage:*
│ • ${usedPrefix + command} s <path> - Save file (reply to media/doc)
│ • ${usedPrefix + command} d <path> - Delete file
│ • ${usedPrefix + command} g <path> - Get file
│ • ${usedPrefix + command} r - Reload plugins

*Examples:*
│ • ${usedPrefix + command} s src lib
│ • ${usedPrefix + command} d src lib core.js
│ • ${usedPrefix + command} g src plugins info info-ping.js`);

    const mode = args[0].toLowerCase();

    try {
        switch (mode) {
            case "s": {
                const pth = args.slice(1);
                let t = pth.length ? join(process.cwd(), ...pth) : process.cwd();
                t = resolve(t);

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
                            .map(i => `${i.isDirectory() ? "📁" : "📄"} ${i.name}${i.isDirectory() ? "/" : ""}`)
                            .join("\n") || "(empty)";

                    return m.reply(`Path: ${t}

${list}`);
                }

                const q = m.quoted;
                const mime = q.mimetype || q.mediaType || "";
                if (!q?.download || !/^(image|video|audio|application)/.test(mime)) {
                    return m.reply("Need media or document");
                }

                const buf = await q.download().catch(() => null);
                if (!buf?.length) return m.reply("Download failed");

                const ext = mime.split("/")[1] || extname(q.fileName || "").slice(1) || "bin";
                const name = q.fileName ? basename(q.fileName) : `file-${Date.now()}.${ext}`;
                const fp = resolve(t, name);

                await mkdir(dirname(fp), { recursive: true });
                await Bun.write(fp, buf);

                return m.reply(`Saved: ${relative(process.cwd(), fp)}`);
            }

            case "d": {
                if (args.length < 2) {
                    return m.reply(`Need file path
Ex: ${usedPrefix + command} d plugins owner file`);
                }

                let t = join(...args.slice(1));
                if (!extname(t)) t += ".js";

                const fp = resolve(process.cwd(), t);
                const f = Bun.file(fp);

                if (!(await f.exists())) {
                    return m.reply(`File not found: ${fp}`);
                }

                await f.delete();
                return m.reply("File deleted");
            }

            case "g": {
                if (args.length < 2) {
                    return m.reply(`Need file path
Ex: ${usedPrefix + command} g plugins owner file`);
                }

                let t = join(...args.slice(1));
                if (!extname(t)) t += ".js";

                const fp = join(process.cwd(), t);
                const buf = Buffer.from(await Bun.file(fp).arrayBuffer());
                const name = basename(t);

                await sock.sendMessage(
                    m.chat,
                    {
                        document: buf,
                        fileName: name,
                        mimetype: "application/javascript"
                    },
                    { quoted: m }
                );
                break;
            }

            case "r": {
                await global.reloadAllPlugins();
                await global.reloadHandler();
                return m.reply("Reloaded");
            }

            default:
                return m.reply(`*File Manager*

*Usage:*
│ • ${usedPrefix + command} s <path>
│ • ${usedPrefix + command} d <path>
│ • ${usedPrefix + command} g <path>
│ • ${usedPrefix + command} r`);
        }
    } catch (e) {
        return m.reply(`Error: ${e.message}`);
    }
};

handler.help = ["file"];
handler.tags = ["owner"];
handler.command = /^(file|f)$/i;
handler.owner = true;

export default handler;