let handler = async (m, { conn }) => {
    try {
        await conn.groupRevokeInvite(m.chat);
        m.reply("Group invite link has been successfully reset.");
    } catch (e) {
        conn.logger.error(e);
        m.reply(`Error: ${e.message}`);
    }
};

handler.help = ["revoke"];
handler.tags = ["group"];
handler.command = /^(revoke)$/i;
handler.group = true;
handler.botAdmin = true;
handler.admin = true;

export default handler;
