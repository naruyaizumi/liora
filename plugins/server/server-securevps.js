import { Client } from "ssh2";

let handler = async (m, { conn, args }) => {
    if (!args[0]) return m.reply("❌ *Format salah!*\n*Contoh: .securevps ipvps|passwordvps*");
    let [ip, pass] = args[0].split("|");
    if (!ip || !pass) return m.reply("❌ *Format salah!*\n*Contoh: .securevps ipvps|passwordvps*");
    let ssh = new Client();
    ssh.on("ready", () => {
        m.reply("🛡️ *Mengamankan VPS kamu... mohon tunggu ya~*");
        ssh.exec(
            `
apt update && apt upgrade -y &&
apt install fail2ban ufw -y &&
systemctl enable --now fail2ban &&
cp /etc/fail2ban/jail.conf /etc/fail2ban/jail.local &&
systemctl restart fail2ban &&
ufw allow OpenSSH &&
ufw allow ssh &&
ufw allow http &&
ufw allow https &&
ufw default deny incoming &&
ufw default allow outgoing &&
ufw --force enable
`,
            async (err, stream) => {
                if (err) throw err;
                stream
                    .on("close", async () => {
                        await conn.sendMessage(
                            m.chat,
                            {
                                text: `🌸 *VPS berhasil diamankan!*
🔐 *fail2ban aktif*
🔥 *Firewall (UFW) aktif & hanya port penting yang terbuka*
Cek status manual:
\`\`\`bash
ufw status verbose
systemctl status fail2ban
\`\`\`
`,
                            },
                            { quoted: m }
                        );
                        ssh.end();
                    })
                    .stderr.on("data", (data) => {
                        console.log("STDERR", data.toString());
                    });
            }
        );
    })
        .on("error", (err) => {
            m.reply(`❌ Gagal terhubung ke VPS:\n${err.message}`);
        })
        .connect({
            host: ip,
            port: 22,
            username: "root",
            password: pass,
        });
};

handler.help = ["securevps"];
handler.tags = ["server"];
handler.command = /^(securevps)$/i;
handler.mods = true;

export default handler;
