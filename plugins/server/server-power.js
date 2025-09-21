let handler = async (m, { args, conn }) => {
    const domain = global.config.domain;
    const capikey = global.config.capikey;
    const apikey = global.config.apikey;
    const signal = args[0];
    const serverId = args[1];
    if (!signal || !serverId) {
        return m.reply(
            "🍩 *Format Salah!*\n\n" +
                "📌 *Gunakan:*\n" +
                "`.power start <id>`\n" +
                "`.power stop <id>`\n" +
                "`.power restart <id>`\n" +
                "`.power kill <id>`"
        );
    }
    if (!["start", "stop", "restart", "kill"].includes(signal.toLowerCase())) {
        return m.reply("🍓 *Signal tidak valid!*\n\n🍰 *Gunakan: start, stop, restart, kill.*");
    }
    try {
        const serversResponse = await fetch(`${domain}/api/application/servers`, {
            method: "GET",
            headers: {
                Accept: "application/json",
                "Content-Type": "application/json",
                Authorization: `Bearer ${apikey}`,
            },
        });
        const serversData = await serversResponse.json();
        if (!serversResponse.ok || !serversData.data)
            return m.reply("🍩 *Gagal mengambil daftar server!*");
        const server = serversData.data.find((s) => s.attributes.id === parseInt(serverId));
        if (!server) return m.reply(`🍰 *Server dengan ID ${serverId} tidak ditemukan!*`);
        const identifier = server.attributes.identifier;
        const powerResponse = await fetch(`${domain}/api/client/servers/${identifier}/power`, {
            method: "POST",
            headers: {
                Accept: "application/json",
                "Content-Type": "application/json",
                Authorization: `Bearer ${capikey}`,
            },
            body: JSON.stringify({ signal: signal.toLowerCase() }),
        });
        if (!powerResponse.ok)
            return m.reply(
                `🍩 *Gagal mengirim perintah ${signal.toUpperCase()} untuk server ${serverId}!*`
            );
        let messageText = `
🧁 *𝙋𝙊𝙒𝙀𝙍 𝘾𝙊𝙉𝙏𝙍𝙊𝙇* 🧁
━━━━━━━━━━━━━━━━━━━
🍓 *Server ID:* ${serverId}
🍪 *Identifier:* ${identifier}
🍰 *Sinyal:* ${signal.toUpperCase()}
━━━━━━━━━━━━━━━━━━━
`;
        const thumbnailUrl = "https://img93.pixhost.to/images/1285/565566923_izumizopedia.jpg";
        const externalAdReply = {
            title: "🍬 𝙈𝘼𝙉𝘼𝙂𝙀 𝙎𝙀𝙍𝙑𝙀𝙍 🍬",
            body: new Date().toLocaleString("id-ID", { timeZone: "Asia/Jakarta" }),
            thumbnailUrl,
            mediaType: 1,
            sourceUrl: "https://instagram.com/naruyaizumi_",
            renderLargerThumbnail: true,
        };
        await conn.sendMessage(
            m.chat,
            { text: messageText, contextInfo: { externalAdReply } },
            { quoted: m }
        );
    } catch (error) {
        console.error(error);
        m.reply(`🍓 *Terjadi kesalahan:* ${error.message}`);
    }
};

handler.help = ["power"];
handler.tags = ["server"];
handler.command = /^(power)$/i;
handler.owner = true;

export default handler;
