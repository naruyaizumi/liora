let handler = async (m, { conn, usedPrefix, command, args: [event], text }) => {
    try {
        if (!event)
            return m.reply(
                `Specify an event to simulate.\n› Example: ${usedPrefix + command} welcome @user\n› Example: ${usedPrefix + command} bye @user`
            );

        await global.loading(m, conn);
        const mentions = text.replace(event, "").trimStart();
        const who = mentions ? conn.parseMention(mentions) : [];
        const part = who.length ? who : [m.sender];

        let act = false;
        switch (event.toLowerCase()) {
            case "add":
            case "invite":
            case "welcome":
                act = "add";
                break;
            case "bye":
            case "kick":
            case "leave":
            case "remove":
                act = "remove";
                break;
            default:
                return m.reply(
                    `Invalid event.\n› Example: ${usedPrefix + command} welcome @user\n› Example: ${usedPrefix + command} bye @user`
                );
        }

        await conn.participantsUpdate({
            id: m.chat,
            participants: part,
            action: act,
        });
    } catch (e) {
        conn.logger.error(e);
        m.reply(`Error: ${e.message}`);
    } finally {
        await global.loading(m, conn, true);
    }
};

handler.help = ["simulate"];
handler.tags = ["group"];
handler.command = /^(simulate|simulation|simulasi)$/i;
handler.group = true;
handler.admin = true;

export default handler;
