import { readdir, readFile } from "fs/promises";
import path from "path";
import { pathToFileURL } from "url";

const handler = async (m, { text, usedPrefix, command }) => {
    if (!text)
        return m.reply(`Enter command name to search.\n› Example: ${usedPrefix + command} tt`);

    const pluginsDir = "./plugins";
    const excludeFiles = ["owner-exec.js", "owner-exec2.js", "owner-exec3.js"];
    const files = (await getAllJSFiles(pluginsDir)).filter(
        (file) => !excludeFiles.includes(path.basename(file))
    );

    const result = [];
    await Promise.all(
        files.map(async (file) => {
            const fullPath = path.resolve(file);
            const modulePath = pathToFileURL(fullPath).href;
            try {
                const content = await readFile(fullPath, "utf8");
                const mod = await import(modulePath);
                const h = mod.default;
                if (!h?.command) return;

                const raw = h.command.toString().replace(/^\/|\/[gimsuy]*$/g, "");
                const cmds = raw
                    .split("|")
                    .map((v) => v.replace(/[.*+?^${}()|[\]\\]/g, "").trim())
                    .filter(Boolean);

                if (cmds.some((cmd) => cmd.toLowerCase() === text.toLowerCase())) {
                    const access = [
                        h.owner && "Owner",
                        h.mods && "Mods",
                        h.admin && "Admin",
                        h.botAdmin && "BotAdmin",
                        h.group && "GroupOnly",
                    ]
                        .filter(Boolean)
                        .join(", ");

                    const hasAPI =
                        typeof h === "function" && h.toString().includes("global.API")
                            ? "Yes"
                            : "No";

                    const help = Array.isArray(h.help) ? h.help.join(", ") : "-";
                    const tags = Array.isArray(h.tags) ? h.tags.join(", ") : "-";
                    const imports =
                        [...content.matchAll(/^import\s+.+?from\s+['"].+?['"]/gm)]
                            .map((m) => m[0])
                            .join("\n") || "—";

                    result.push(
                        [
                            "```",
                            `┌─[${path.basename(file)}]────────────`,
                            `│  Command Search`,
                            "└────────────────────────",
                            `File     : ${file.replace("./", "")}`,
                            `Feature  : ${help}`,
                            `Command  : ${cmds.join(", ")}`,
                            `Count    : ${cmds.length}`,
                            `Tags     : ${tags}`,
                            `Access   : ${access || "-"}`,
                            `API Used : ${hasAPI}`,
                            "────────────────────────",
                            "Imports:",
                            imports,
                            "```",
                        ].join("\n")
                    );
                }
            } catch (err) {
                console.error(`Error in ${file}:`, err.message);
            }
        })
    );

    if (!result.length) return m.reply(`No feature found for command "${text}".`);
    m.reply(result.join("\n\n"));
};

handler.help = ["carifitur"];
handler.tags = ["tools"];
handler.command = /^(carifitur|cf)$/i;
handler.mods = true;

export default handler;

async function getAllJSFiles(dir) {
    const entries = await readdir(dir, { withFileTypes: true });
    const files = await Promise.all(
        entries.map(async (entry) => {
            const full = path.join(dir, entry.name);
            if (entry.isDirectory()) return await getAllJSFiles(full);
            else if (entry.name.endsWith(".js")) return full;
            else return [];
        })
    );
    return files.flat();
}
