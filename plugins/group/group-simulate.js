let handler = async (m, { conn, usedPrefix, command, args: [event], text }) => {
    if (!event)
        return await conn.reply(
            m.chat,
            `*Contoh Penggunaan:*
*${usedPrefix + command} welcome @user*
*${usedPrefix + command} bye @user*
*${usedPrefix + command} promote @user*
*${usedPrefix + command} demote @user*`.trim(),
            m
        );
    let mentions = text.replace(event, "").trimStart();
    let who = mentions ? conn.parseMention(mentions) : [];
    let part = who.length ? who : [m.sender];
    let act = false;
    m.reply(`*❃ Simulating ${event}...*`);
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
        case "promote":
            act = "promote";
            break;
        case "demote":
            act = "demote";
            break;
        default:
            return await conn.reply(
                m.chat,
                `*Contoh Penggunaan:*
*${usedPrefix + command} welcome @user*
*${usedPrefix + command} bye @user*
*${usedPrefix + command} promote @user*
*${usedPrefix + command} demote @user*`.trim(),
                m
            );
    }
    return conn.participantsUpdate({
        id: m.chat,
        participants: part,
        action: act,
    });
};

handler.help = ["simulate"];
handler.tags = ["group"];
handler.command = /^(simulate|simulation|simulasi)$/i;
handler.owner = true;
handler.admin = true;

export default handler;
