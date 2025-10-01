let handler = async (m, { conn, args, usedPrefix, command }) => {
    try {
        await global.loading(m, conn);
        let domain = args[0];
        if (!domain)
            return m.reply(
                `⚠️ *Masukkan domain yang ingin dicek.*\n\n📌 *Contoh: ${usedPrefix + command} naruyaizumi.online*`
            );
        let apiUrl = global.API("btz", "/api/tools/subdomain-finder", { query: domain }, "apikey");
        let res = await fetch(apiUrl);
        let json = await res.json();
        if (!json.status || !Array.isArray(json.result)) {
            return m.reply("❌ Gagal mengambil data subdomain. Coba lagi nanti.");
        }
        if (json.result.length === 0) {
            return m.reply(`📭 *Tidak ditemukan subdomain untuk ${domain}*`);
        }
        let teks = `🔍 *Subdomain Ditemukan untuk: ${domain}*
━━━━━━━━━━━━━━━━━━━━
${json.result.map((v, i) => `*${i + 1}. ${v}*`).join("\n")}
━━━━━━━━━━━━━━━━━━━━
📌 *Total: ${json.result.length} subdomain ditemukan.*`;
        m.reply(teks);
    } catch (e) {
        console.error(e);
        m.reply("⚠️ *Terjadi kesalahan teknis saat mengambil subdomain.*");
    } finally {
        await global.loading(m, conn, true);
    }
};

handler.help = ["subdofind"];
handler.tags = ["tools"];
handler.command = /^(subdofind|subdomainfinder)$/i;

export default handler;
