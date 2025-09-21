import { Client } from "ssh2";

let handler = async (m, { text, conn }) => {
    try {
        if (!text) return m.reply("❌ *Format salah!* Gunakan: ipvps|pwvps|token_node");
        let [ipvps, passwd, token] = text.split("|").map((v) => v.trim());
        if (!ipvps || !passwd || !token)
            return m.reply("❌ *Format salah!* Gunakan: ipvps|pwvps|token_node");
        const connSettings = {
            host: ipvps,
            port: "22",
            username: "root",
            password: passwd,
        };
        const command = `${token} && systemctl start wings`;
        const ress = new Client();
        ress.on("ready", () => {
            ress.exec(command, (err, stream) => {
                if (err) throw err;
                stream
                    .on("close", async () => {
                        await conn.sendMessage(
                            m.chat,
                            {
                                text: `🚀 *Wings telah dijalankan dengan sukses!*
━━━━━━━━━━━━━━━━━━━
📡 *IP VPS: ${ipvps}*
⚙️ *Status Wings: Berjalan*
⏳ *Pastikan untuk memeriksa status secara berkala!*
━━━━━━━━━━━━━━━━━━━
🔧 *Gunakan perintah lain untuk konfigurasi tambahan atau pengecekan status.*`,
                            },
                            { quoted: m }
                        );
                        ress.end();
                    })
                    .on("data", async (data) => {
                        console.log(data.toString());
                    })
                    .stderr.on("data", async (data) => {
                        console.log("STDERR:", data.toString());
                    });
            });
        })
            .on("error", (err) => {
                console.log("Connection Error:", err);
                m.reply("❌ *Katasandi atau IP tidak valid!*");
            })
            .connect(connSettings);
    } catch {
        m.reply("❌ *Terjadi kesalahan!* Pastikan format benar dan server bisa diakses.");
    }
};

handler.help = ["startwings"];
handler.tags = ["server"];
handler.command = /^(startwings)$/i;
handler.mods = true;

export default handler;
