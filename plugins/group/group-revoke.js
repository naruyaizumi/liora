let handler = async (m) => {
    try {
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
