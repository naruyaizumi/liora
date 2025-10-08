let handler = async (m, { conn, groupMetadata }) => {
    try {
        const code = await conn.groupInviteCode(m.chat);
        const link = `https://chat.whatsapp.com/${code}`;
        const timestamp = new Date().toTimeString().split(" ")[0];

        const response = [
            "```",
            `┌─[${timestamp}]────────────`,
            `│  GROUP LINK`,
            "└──────────────────────",
            `Name : ${groupMetadata.subject}`,
            `ID   : ${m.chat}`,
            "───────────────────────",
            `${link}`,
            "```",
        ].join("\n");

        await conn.sendMessage(m.chat, { text: response }, { quoted: m });
    } catch (err) {
        console.error(err);
        m.reply("Failed to retrieve group link.");
    }
};

handler.help = ["grouplink"];
handler.tags = ["group"];
handler.command = /^(grouplink|link)$/i;
handler.group = true;
handler.botAdmin = true;

export default handler;
