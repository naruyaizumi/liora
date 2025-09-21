let handler = async (m, { conn }) => {
    await global.loading(m, conn);
    let message = `🍱 *Informasi API Key* 🍡
━━━━━━━━━━━━━━━━━━━
`;
    try {
        let result = {};
        try {
            const res = await fetch(global.API("btz", "/api/checkkey", {}, "apikey"));
            if (!res.ok) throw new Error(`Status: ${res.status}`);
            const json = await res.json();
            result = json.result || {};
        } catch (e) {
            message += `🍋 *Gagal mengambil data dari API: ${e.message}*\n`;
        }
        message += `
🍵 *Email: ${result.email || "-"}*
🍟 *Username: ${result.username || "-"}*
🍕 *Admin: ${result.admin ? "Yes" : "No"}*
🍜 *Role: ${result.role || "-"}*
🍫 *Total Hit: ${result.totalHit || "-"}*
🥗 *Hari Ini: ${result.todayHit || "-"}*
🥪 *Limit: ${result.limit || "-"}*
🍩 *Expired: ${result.expired || "-"}*
━━━━━━━━━━━━━━━━━━━
🍰 *Gunakan API ini dengan bijak dan efisien!*`;
        await conn.sendMessage(m.chat, { text: message }, { quoted: m });
    } catch (error) {
        console.error("Error:", error);
        m.reply(`🍉 *Terjadi Kesalahan Teknis!*
🍒 *Detail:* ${error.message}`);
    } finally {
        await global.loading(m, conn, true);
    }
};

handler.help = ["cekapikey"];
handler.tags = ["info"];
handler.command = /^(cekapikey|cekapi)$/i;
handler.mods = true;

export default handler;
