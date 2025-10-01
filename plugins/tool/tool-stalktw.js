let handler = async (m, { conn, text, usedPrefix, command }) => {
    if (!text) return m.reply(`🍰 *Contoh: ${usedPrefix + command} jokowi*`);
    await global.loading(m, conn);
    try {
        let res = await fetch(
            global.API("btz", "/api/stalk/twitter", { username: text }, "apikey")
        );
        if (!res.ok) throw "❌ Tidak bisa mengakses data Twitter.";
        let json = await res.json();
        if (!json.status || !json.result) throw "🙈 Data tidak ditemukan.";
        let {
            profileImage,
            bio,
            username,
            fullName,
            follower,
            following,
            totalPosts,
            favoritCount,
            createdAt,
            location,
        } = json.result;
        let caption = `
🍓 *TWITTER STALKER*
🧁 *Nama: ${fullName}*
🍰 *Username: @${username}*
🍬 *Bio:* ${bio || "–"}
🍪 *Follower: ${follower.toLocaleString()}*
🍩 *Following: ${following.toLocaleString()}*
🍮 *Tweet: ${totalPosts}*
🍡 *Like: ${favoritCount}*
🍫 *Lokasi: ${location || "–"}*
🍧 *Bergabung: ${new Date(createdAt).toLocaleDateString("id-ID")}*
`.trim();
        await conn.sendFile(m.chat, profileImage, "twstalk.jpg", caption, m);
    } catch (e) {
        console.error(e);
        m.reply(typeof e === "string" ? e : "🥀 Gagal mengambil data Twitter.");
    } finally {
        await global.loading(m, conn, true);
    }
};

handler.help = ["twstalk"];
handler.tags = ["tools"];
handler.command = /^(twstalk|stalktw)$/i;

export default handler;
