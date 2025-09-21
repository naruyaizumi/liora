let handler = async (m, { args, conn }) => {
    try {
        if (!args[0]) return m.reply("❌ *Format salah!* Gunakan: .subdo subdomain|ip");
        const input = args
            .join(" ")
            .split("|")
            .map((v) => v.trim());
        if (input.length < 2) return m.reply("❌ *Format salah!* Gunakan: .subdo subdomain|ip");
        const [subdomain, ip] = input;
        const dom = Object.keys(global.config.Subdo);
        if (dom.length === 0) return m.reply("🚨 *Tidak ada domain yang tersedia!*");
        const domainList = dom.map((d, i) => `*${i + 1}.* ${d}`).join("\n");
        const caption = `✨ *Pilih Domain untuk Subdomain*
━━━━━━━━━━━━━━━━━━━
🌐 *Subdomain: ${subdomain}*
📡 *IP: ${ip}*
━━━━━━━━━━━━━━━━━━━
📍 *Daftar Domain:*
${domainList}
━━━━━━━━━━━━━━━━━━━
🔧 *Gunakan: .domain nomor subdomain|ip*
🔧 *Contoh: .domain 2 ${subdomain}|${ip}*
🔧 *Artinya: Tambah ${subdomain}.domain-ke-2 ke ${ip}*`;
        await conn.sendMessage(
            m.chat,
            {
                text: caption,
            },
            { quoted: m }
        );
    } catch {
        m.reply("❌ *Terjadi kesalahan!* Periksa kembali format perintah.");
    }
};

handler.help = ["subdo"];
handler.tags = ["server"];
handler.command = /^(subdo|subdomain)$/i;
handler.mods = true;

export default handler;
