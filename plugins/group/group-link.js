let handler = async (m, { conn }) => {
    try {
        const invite = await conn.groupInviteCode(m.chat);
        await m.reply(`https://chat.whatsapp.com/${invite}`);
    } catch (e) {
        console.error(e);
        await m.reply(
            "Error: Unable to retrieve group link. Make sure the bot is admin and the group is not private."
        );
    }
};

handler.help = ["grouplink"];
handler.tags = ["group"];
handler.command = /^(grouplink|link)$/i;
handler.group = true;
handler.botAdmin = true;

export default handler;
