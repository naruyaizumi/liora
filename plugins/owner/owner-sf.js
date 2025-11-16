import { readdir, mkdir } from "node:fs/promises";
import path from "path";

const handler = async (m, { args, conn }) => {
    try {
        let target = args.length ? path.join(process.cwd(), ...args) : process.cwd();
        target = path.resolve(target);

        if (!m.quoted) {
            const items = await readdir(target, { withFileTypes: true }).catch(() => null);
            if (!items) return m.reply(`Folder not found: ${target}`);

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
                        (item) =>
                            `${item.isDirectory() ? "📁" : "📄"} ${item.name}${item.isDirectory() ? "/" : ""}`
                    )
                    .join("\n") || "(empty directory)";
            return m.reply(`Path: ${target}\n\n${list}`);
        }

        const q = m.quoted;
        const mime = q.mimetype || q.mediaType || "";
        if (!q?.download || !/^(image|video|audio|application)/.test(mime))
            return m.reply("Quoted message must be a media or document file.");

        const buffer = await q.download().catch(() => null);
        if (!buffer?.length) return m.reply("Failed to download the quoted media.");

        const ext = mime?.split("/")[1] || path.extname(q.fileName || "")?.slice(1) || "bin";
        const baseName = q.fileName ? path.basename(q.fileName) : `file-${Date.now()}.${ext}`;
        const fullpath = path.resolve(target, baseName);
        await mkdir(path.dirname(fullpath), { recursive: true });
        await Bun.write(fullpath, buffer);
        return m.reply(`Saved as: ${path.relative(process.cwd(), fullpath)}`);
    } catch (e) {
        conn.logger.error(e);
        return m.reply(`Error: ${e.message}`);
    }
};

handler.help = ["sf"];
handler.tags = ["owner"];
handler.command = /^(sf|savefile)$/i;
handler.owner = true;

export default handler;
