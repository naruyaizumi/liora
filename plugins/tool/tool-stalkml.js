let handler = async (m, { conn, args, usedPrefix, command }) => {
    if (!args[0] || !args[1])
        return m.reply(`🎮 *Contoh: ${usedPrefix + command} 214885010 2253*
*Format: UID SERVER*`);
    await global.loading(m, conn);
    try {
        let [uid, server] = args;
        let res = await fetch(global.API("btz", "/api/stalk/ml-v2", { id: uid, server }, "apikey"));
        if (!res.ok) throw "❌ *Tidak bisa akses API.*";
        let json = await res.json();
        if (!json.status || !json.result || !json.result.success)
            throw "🙈 *Gagal ambil data. Pastikan UID & Server benar.*";
        let info = json.result.data.stalk_info;
        let nickname = (info.stalk_data.match(/In-Game Nickname: (.+)/) || [])[1] || "-";
        let country = (info.stalk_data.match(/Country: (.+)/) || [])[1] || "-";
        let region = info.region || "-";
        let user_id = info.user_id;
        let text = `🎮 *MOBILE LEGENDS STALK*
👑 *Nickname: ${nickname}*
🆔 *User ID: ${user_id}*
🌍 *Region: ${region} (${country})*

🎁 *Item Shop Tersedia:*`;
        let shops = info.shop_data;
        for (let type in shops) {
            let items = shops[type].goods || [];
            text += `
📦 *${shops[type].name.toUpperCase()}*`;
            for (let item of items) {
                let title = item.title;
                let reached = item.limits.reached ? "🪄 Sudah diklaim" : "📭 Belum diklaim";
                let inv = item.limits.inventory;
                let percent = inv ? `${Math.round(Number(inv) * 100)}%` : "0%";
                text += `
🍬 *Item: ${title}*
🔓 *Status: ${reached}*
📦 *Ketersediaan: ${percent}*\n`;
            }
        }
        let pass = json.result.data.categorized_shop?.weeklyPass?.items || [];
        if (pass.length) {
            text += `
🪙 *WEEKLY PASS*`;
            for (let p of pass) {
                let title = p.title;
                let status = p.limits.reached_limit ? "💎 Aktif" : "⛔ Tidak Aktif";
                text += `
🎟️ *Paket: ${title}*
📌 *Status: ${status}*\n`;
            }
        }
        await conn.reply(m.chat, text.trim(), m);
    } catch (e) {
        console.error(e);
        m.reply(typeof e === "string" ? e : "🥀 *Gagal mengambil data ML.*");
    } finally {
        await global.loading(m, conn, true);
    }
};

handler.help = ["stalkml"];
handler.tags = ["tools"];
handler.command = /^(stalkml|mlstalk)$/i;

export default handler;
