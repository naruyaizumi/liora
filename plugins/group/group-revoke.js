let handler = async (m, { conn }) => {
    const timestamp = new Date().toTimeString().split(" ")[0];
    try {
        const newCode = await conn.groupRevokeInvite(m.chat);
        const newLink = `https://chat.whatsapp.com/${newCode}`;
        await m.reply('Group invite link has been successfully reset.');
    } catch (e) {
        console.error(e);
        await m.reply('Error while resetting the group invite link.');
    }
};

handler.help = ["revoke"];
handler.tags = ["group"];
handler.command = /^(revoke)$/i;
handler.group = true;
handler.botAdmin = true;
handler.admin = true;

export default handler;
