import { createSubDomain } from "../../lib/server.js";

let handler = async (m, { args, conn, usedPrefix, command }) => {
    try {
        if (!args[0])
            return m.reply(
                `🍩 *Domain tidak ditemukan!*\n🍓 *Gunakan: ${usedPrefix + command} nomor host|ip*`
            );
        if (isNaN(args[0]))
            return m.reply(
                `🍩 *Domain tidak ditemukan!*\n🍓 *Gunakan: ${usedPrefix + command} nomor host|ip*`
            );
        const dom = Object.keys(global.config.Subdo);
        if (Number(args[0]) > dom.length)
            return m.reply(
                `🍩 *Domain tidak ditemukan!*\n🍓 *Gunakan: ${usedPrefix + command} nomor host|ip*`
            );
        if (!args[1]?.includes("|"))
            return m.reply(
                `🍩 *Format salah!*\n🍓 *Gunakan: ${usedPrefix + command} nomor host|ip*`
            );
        const tldnya = dom[args[0] - 1];
        const [host, ip] = args[1].split("|").map((v) => v.trim());
        const result = await createSubDomain(host.toLowerCase(), ip, tldnya);
        if (result.success) {
            const caption = `
🧁 *Subdomain Berhasil Dibuat!*
━━━━━━━━━━━━━━━━━━━
🍪 *Subdomain: ${result.name}*
🍓 *IP Server: ${result.ip}*
🍰 *Domain: ${tldnya}*
━━━━━━━━━━━━━━━━━━━
`;
            await conn.sendMessage(m.chat, { text: caption }, { quoted: m });
        } else {
            m.reply(`🍬 *Gagal membuat subdomain!* ${result.error}`);
        }
    } catch (err) {
        console.error(err);
        m.reply("🍩 *Terjadi kesalahan!* Periksa kembali format perintah.");
    }
};

handler.help = ["domain"];
handler.tags = ["server"];
handler.command = /^(domain)$/i;
handler.mods = true;

export default handler;
