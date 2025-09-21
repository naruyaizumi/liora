import { execSync } from "child_process";
import os from "os";

let handler = async (m, { conn, args }) => {
    let msg = args.join(" ") || `🍓 update: auto-push via bot`;
    try {
        if (!global.config?.PAT_TOKEN) {
            return m.reply("🍩 *PAT_TOKEN belum diatur di global.config!* 💔");
        }
        let remoteUrl = `https://x-access-token:${global.config.PAT_TOKEN}@github.com/naruyaizumi/liora.git`;
        execSync(`git remote set-url origin ${remoteUrl}`);
        let status = execSync("git status --short").toString();
        if (!status) {
            return m.reply("🍰 Tidak ada perubahan file untuk di-push, bersih manis ✨");
        }
        execSync("git add .");
        execSync(`git commit -m "${msg}" || echo 'no changes'`);
        execSync("git push origin main");
        let user = os.userInfo().username;
        await conn.sendMessage(
            m.chat,
            {
                text: `🍡 *Push sukses ke GitHub!*\n\n📌 Commit: ${msg}\n👤 User: ${user}\n🌸 Semua sudah rapi & manis 💖`,
                contextInfo: {
                    externalAdReply: {
                        title: "Push Sukses!",
                        body: msg,
                        thumbnailUrl: "https://files.cloudkuimages.guru/images/7ad6423e2075.jpg",
                        sourceUrl: global.config.website,
                        mediaType: 1,
                        renderLargerThumbnail: true,
                    },
                },
            },
            { quoted: m }
        );
    } catch (err) {
        await m.reply(`🍬 *Push gagal:*\n\`\`\`${err.message}\`\`\``);
    }
};

handler.help = ["push"];
handler.tags = ["owner"];
handler.command = /^(push)$/i;
handler.mods = true;

export default handler;
