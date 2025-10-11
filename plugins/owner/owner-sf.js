import fs from "fs/promises";
import path from "path";

const handler = async (m, { args }) => {
    const target = path.resolve(...(args.length ? args : ["."]));

    try {
        if (!m.quoted) {
            const items = await fs.readdir(target, { withFileTypes: true }).catch(() => null);
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

            return m.reply(
                [
                    "```",
                    `Path  : ${target}`,
                    "───────────────────────────",
                    list,
                    "───────────────────────────",
                    "Directory listing complete.",
                    "```",
                ].join("\n")
            );
        }

        const q = m.quoted;
        if (!q?.download) return m.reply("This message is not a media file.");

        const buffer = await q.download().catch(() => null);
        if (!buffer) return m.reply("Failed to download the quoted file.");

        const filename = q.fileName || "file.unknown";
        const fullpath = path.join(target, filename);

        await fs.mkdir(path.dirname(fullpath), { recursive: true });
        await fs.writeFile(fullpath, buffer);

        return m.reply(
            [
                "```",
                `Saved As : ${fullpath}`,
                "───────────────────────────",
                "File written successfully.",
                "```",
            ].join("\n")
        );
    } catch (err) {
        return m.reply(`Error: ${err.message}`);
    }
};

handler.help = ["sf"];
handler.tags = ["owner"];
handler.command = /^(sf|savefile)$/i;
handler.mods = true;

export default handler;
