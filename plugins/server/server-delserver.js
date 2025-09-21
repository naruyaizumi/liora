let handler = async (m, { args, conn }) => {
    const domain = global.config.domain;
    const apikey = global.config.apikey;
    const serverId = args[0];
    if (!serverId) return m.reply("❌ *Mohon masukkan Server ID yang ingin dihapus!*");
    try {
        const serverResponse = await fetch(`${domain}/api/application/servers/${serverId}`, {
            method: "GET",
            headers: {
                Accept: "application/json",
                "Content-Type": "application/json",
                Authorization: `Bearer ${apikey}`,
            },
        });
        if (!serverResponse.ok)
            throw new Error("❌ *Server tidak ditemukan atau telah dihapus sebelumnya!*");
        const serverData = await serverResponse.json();
        const serverName = serverData.attributes.name;
        const userId = serverData.attributes.user;
        const deleteResponse = await fetch(`${domain}/api/application/servers/${serverId}`, {
            method: "DELETE",
            headers: {
                Accept: "application/json",
                "Content-Type": "application/json",
                Authorization: `Bearer ${apikey}`,
            },
        });
        if (!deleteResponse.ok) throw new Error(`❌ *Gagal menghapus Server ID: ${serverId}!*`);
        let reportText = `
📋 *\`𝘿𝙀𝙇𝙀𝙏𝙀 𝙎𝙀𝙍𝙑𝙀𝙍\`* 📋
🖥️ *Server Name: ${serverName}*
📌 *Server ID: ${serverId}*
👤 *User ID: ${userId}*
`;
        const thumbnailUrl = "https://img86.pixhost.to/images/493/563104371_izumizopedia.jpg";
        const externalAdReply = {
            title: "💻 Server Delete Report!",
            body: `Name: ${serverName} | ID: ${serverId}`,
            thumbnailUrl: thumbnailUrl,
            mediaType: 1,
            sourceUrl: "https://instagram.com/naruyaizumi_",
            renderLargerThumbnail: true,
        };
        await conn.sendMessage(
            m.chat,
            {
                text: reportText,
                contextInfo: { externalAdReply },
            },
            { quoted: m }
        );
    } catch (error) {
        console.error(error.message);
        m.reply(`❌ *Terjadi kesalahan: ${error.message}*`);
    }
};

handler.help = ["delserver"];
handler.tags = ["server"];
handler.command = /^(delserver|ds)$/i;
handler.owner = true;

export default handler;
