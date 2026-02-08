/**
 * @file File manager command handler
 * @module plugins/owner/file
 * @license Apache-2.0
 * @author Naruya Izumi
 */

import { readdir, mkdir } from "node:fs/promises";
import { join, resolve, extname, basename, dirname, relative } from "node:path";

const HELP =
    `*File Manager*\n\n` +
    `*Usage:*\n` +
    `│ • {cmd} s <path> - Save file (reply to media/doc)\n` +
    `│ • {cmd} d <path> - Delete file\n` +
    `│ • {cmd} g <path> - Get file\n` +
    `│ • {cmd} r - Reload plugins\n\n` +
    `*Examples:*\n` +
    `│ • {cmd} s src lib - Save to src/lib/\n` +
    `│ • {cmd} d src lib core.js - Delete file\n` +
    `│ • {cmd} g src plugins info info-ping.js - Get file`;

let handler = async (m, { sock, args, usedPrefix, command }) => {
    const cmd = usedPrefix + command;

    if (!args.length) return m.reply(HELP.replaceAll("{cmd}", cmd));

    const mode = args[0].toLowerCase();

    try {
        switch (mode) {
            // Save file
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
                            .map((i) => `${i.isDirectory() ? "📁" : "📄"} ${i.name}${i.isDirectory() ? "/" : ""}`)
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

                const ext = mime?.split("/")[1] || extname(q.fileName || "")?.slice(1) || "bin";
                const name = q.fileName ? basename(q.fileName) : `file-${Date.now()}.${ext}`;
                const fp = resolve(t, name);
                await mkdir(dirname(fp), { recursive: true });
                await Bun.write(fp, buf);
                return m.reply(`Saved: ${relative(process.cwd(), fp)}`);
            }

            // Delete file
            case "d": {
                if (args.length < 2) {
                    return m.reply(`Need file path\nEx: ${cmd} d plugins owner file`);
                }

                let t = join(...args.slice(1));
                if (!extname(t)) t += ".js";
                const fp = resolve(process.cwd(), t);

                const f = Bun.file(fp);
                const ex = await f.exists();
                if (!ex) throw new Error(`File not found: ${fp}`);

                await f.delete();
                return m.reply("File deleted");
            }

            // Get file
            case "g": {
                if (args.length < 2) {
                    return m.reply(`Need file path\nEx: ${cmd} g plugins owner file`);
                }

                let t = join(...args.slice(1));
                if (!extname(t)) t += ".js";
                const fp = join(process.cwd(), t);

                const buf = Buffer.from(await Bun.file(fp).arrayBuffer());
                const name = t.split("/").pop();

                await sock.sendMessage(
                    m.chat,
                    {
                        document: buf,
                        fileName: name,
                        mimetype: "application/javascript",
                    },
                    { quoted: m }
                );
                break;
            }

            // Reload plugins
            case "r": {
                await global.reloadAllPlugins();
                await global.reloadHandler();
                return m.reply("Reloaded");
            }

            default:
                return m.reply(HELP.replaceAll("{cmd}", cmd));
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