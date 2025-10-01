let handler = async (m, { conn, text, usedPrefix, command }) => {
    if (!text) return m.reply(`🍙 *Contoh penggunaan: ${usedPrefix + command} naruyaizumi*`);
    await global.loading(m, conn);
    try {
        let res = await fetch(global.API("btz", "/api/stalk/ig", { username: text }, "apikey"));
        if (!res.ok) throw `🍜 *Gagal mengakses API!*`;
        let json = await res.json();
        if (json.code !== 200 || !json.result) throw `🍡 *Akun Instagram tidak ditemukan!*`;
        let ig = json.result;
        let caption = `
🍱 *INSTAGRAM STALK* 🍱
━━━━━━━━━━━━━━━━━━━
👤 *Username: ${ig.username}*
🥢 *Nama: ${ig.fullName || "-"}*
🍜 *Bio:* ${ig.bio || "-"}

👀 *Followers: ${ig.followers}*
👣 *Following: ${ig.following}*
📸 *Jumlah Post: ${ig.postsCount}*
━━━━━━━━━━━━━━━━━━━
`.trim();
        await conn.sendFile(m.chat, ig.photoUrl, "profile.jpg", caption, m);
    } catch (e) {
        console.error(e);
        m.reply(typeof e === "string" ? e : "🍩 *Terjadi kesalahan saat stalk Instagram.*");
    } finally {
        await global.loading(m, conn, true);
    }
};

handler.help = ["stalkig"];
handler.tags = ["tools"];
handler.command = /^(igstalk|stalkig)$/i;

export default handler;
