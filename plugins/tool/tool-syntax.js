import { readdirSync, statSync, readFileSync } from "fs";
import { join } from "path";
import syntaxerror from "syntax-error";

let handler = async (m) => {
    function scanJS(dir) {
        let res = [];
        for (let file of readdirSync(dir)) {
            let full = join(dir, file);
            if (["node_modules", "auth"].includes(file)) continue;
            if (statSync(full).isDirectory()) res.push(...scanJS(full));
            else if (file.endsWith(".js")) res.push(full);
        }
        return res;
    }

    let files = scanJS("./");
    let hasil = [];

    for (let file of files) {
        let code;
        try {
            code = readFileSync(file, "utf8");
        } catch (e) {
            hasil.push(
                `📄 *File: ${file.replace("./", "")}*\n🚫 *Tidak bisa dibaca: ${e.message}*`
            );
            continue;
        }

        let err = syntaxerror(code, file, {
            sourceType: "module",
            allowAwaitOutsideFunction: true,
        });

        if (err) {
            hasil.push(
                [
                    `🍓 *File: ${file.replace("./", "")}*`,
                    `🍩 *Error: ${err.name}*`,
                    `🍬 *Baris: ${err.line ?? "-"}, Kolom: ${err.column ?? "-"}*`,
                    `🍰 *Pesan: _${err.message}_*`,
                    `🧁 *Cuplikan:*\n\n\`\`\`${err.annotated.trim().slice(0, 300)}\`\`\``,
                ].join("\n")
            );
        }
    }

    if (!hasil.length)
        return m.reply("🍦 *Semua file JavaScript aman, tidak ditemukan syntax error.*");
    m.reply(`🍫 *Ditemukan error syntax:*\n\n${hasil.join("\n\n")}`);
};

handler.help = ["syntaxcheck"];
handler.tags = ["owner"];
handler.command = /^(syntaxcheck|syntax)$/i;
handler.owner = true;

export default handler;
