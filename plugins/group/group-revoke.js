let handler = async (m, { conn }) => {
    const timestamp = new Date().toTimeString().split(" ")[0];

    try {
        const newCode = await conn.groupRevokeInvite(m.chat);
        const newLink = `https://chat.whatsapp.com/${newCode}`;

        const text = [
            "```",
            `┌─[${timestamp}]────────────`,
            `│  GROUP LINK RESET`,
            "└──────────────────────",
            `Status : SUCCESS`,
            `New Link : ${newLink}`,
            "───────────────────────",
            "Group invite link has been successfully reset.",
            "```",
        ].join("\n");

        await m.reply(text);
    } catch (e) {
        console.error(e);

        const errText = [
            "```",
            `┌─[${timestamp}]────────────`,
            `│  GROUP LINK RESET`,
            "└──────────────────────",
            `Status : FAILED`,
            "───────────────────────",
            "Error while resetting the group invite link.",
            "```",
        ].join("\n");

        await m.reply(errText);
    }
};

handler.help = ["revoke"];
handler.tags = ["group"];
handler.command = /^(revoke)$/i;
handler.group = true;
handler.botAdmin = true;
handler.admin = true;

export default handler;
