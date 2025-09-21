import { execSync } from "child_process";

let handler = async (m, { conn }) => {
    try {
        let hasil = execSync("yarn lint", { encoding: "utf8" });
        if (!hasil.trim()) return m.reply("🍫 *Semua file lolos ESLint, gak ada error!* ✨");
        await conn.sendMessage(
            m.chat,
            {
                image: { url: "https://files.cloudkuimages.guru/images/7068db19ea6b.jpg" },
                caption: `🍩 *Hasil ESLint:*\n\n${hasil}`,
            },
            { quoted: m }
        );
    } catch (err) {
        await m.reply(`🚫 *Lint error:*\n\`\`\`${err.message}\`\`\``);
    }
};

handler.help = ["eslint"];
handler.tags = ["owner"];
handler.command = /^(eslint)$/i;
handler.mods = true;

export default handler;
