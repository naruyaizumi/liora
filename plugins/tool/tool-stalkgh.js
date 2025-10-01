let handler = async (m, { conn, text, usedPrefix, command }) => {
    if (!text) return m.reply(`🍙 *Contoh penggunaan: ${usedPrefix + command} naruyaizumi*`);
    await global.loading(m, conn);
    try {
        let res = await fetch(global.API("btz", "/api/stalk/github", { username: text }, "apikey"));
        if (!res.ok) throw `🍜 *Gagal mengakses API!*`;
        let json = await res.json();
        if (json.code !== 200 || !json.result?.user) throw `🍡 *User GitHub tidak ditemukan!*`;
        let user = json.result.user;
        let caption = `
🍱 *GITHUB USER STALK* 🍱
━━━━━━━━━━━━━━━━━━━
👤 *Profil*
🥢 *Username: ${user.username}*
🧩 *ID User: ${user.idUser}*
🍜 *Node ID: ${user.nodeId}*
🍙 *Nama: ${user.name || "-"}*
🍡 *Type: ${user.type}*
🥟 *Site Admin: ${user.isSiteAdmin ? "Ya" : "Tidak"}*

🏢 *Company: ${user.company || "-"}*
🌐 *Blog: ${user.blog || "-"}*
📧 *Email: ${user.email || "-"}*
🤝 *Hireable: ${user.hireable ? "Ya" : "Tidak"}*
📖 *Bio: ${user.bio || "-"}*

📂 *Repositori Publik: ${user.publicRepos}*
📑 *Gists Publik: ${user.publicGists}*
⭐ *Followers: ${user.followers}*
👀 *Following: ${user.following}*

📅 *Dibuat: ${new Date(user.createdAt).toLocaleDateString("id-ID")}*
🛠️ *Update: ${new Date(user.updatedAt).toLocaleDateString("id-ID")}*

🔗 *GitHub URL: ${user.githubUrl}*
━━━━━━━━━━━━━━━━━━━
`.trim();
        await conn.sendFile(m.chat, user.avatarUrl, "ghuser.jpg", caption, m);
    } catch (e) {
        console.error(e);
        m.reply(typeof e === "string" ? e : "🍩 *Terjadi kesalahan saat stalk GitHub user.*");
    } finally {
        await global.loading(m, conn, true);
    }
};

handler.help = ["stalkgh"];
handler.tags = ["tools"];
handler.command = /^(ghstalk|stalkgh)$/i;

export default handler;
