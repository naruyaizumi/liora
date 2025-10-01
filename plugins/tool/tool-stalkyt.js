let handler = async (m, { conn, text, usedPrefix, command }) => {
    if (!text) return m.reply(`🍰 *Contoh: ${usedPrefix + command} naruyaizumi*`);
    await global.loading(m, conn);
    try {
        let res = await fetch(global.API("btz", "/api/stalk/yt", { username: text }, "apikey"));
        if (!res.ok) throw "❌ Tidak bisa mengakses data YouTube.";
        let json = await res.json();
        if (!json.status || !json.result || !json.result.data || !json.result.data.length)
            throw "🙈 Channel tidak ditemukan.";
        let data = json.result.data[0];
        let { channelId, url, channelName, avatar, isVerified, subscriberH, description } = data;
        let caption = `
🍓 *YOUTUBE STALKER*
🧁 *Channel: ${channelName}*
🍰 *Verified: ${isVerified ? "Ya" : "Tidak"}*
🍬 *Subscriber: ${subscriberH}*
🍪 *Channel ID: ${channelId}*
🍩 *Deskripsi:* ${description}
🍮 *Link: ${url}*
`.trim();
        await conn.sendFile(m.chat, avatar, "ytstalk.jpg", caption, m);
    } catch (e) {
        console.error(e);
        m.reply(typeof e === "string" ? e : "🥀 Gagal mengambil data YouTube.");
    } finally {
        await global.loading(m, conn, true);
    }
};

handler.help = ["ytstalk"];
handler.tags = ["tools"];
handler.command = /^(ytstalk|stalkyt)$/i;

export default handler;
