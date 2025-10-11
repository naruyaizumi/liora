let handler = async (m, { text, usedPrefix, command }) => {
    const timestamp = new Date().toTimeString().split(" ")[0];
    let chat = global.db.data.chats[m.chat];

    if (!text) {
        const status = chat.mute ? "OFFLINE" : "ONLINE";
        const info = [
            "```",
            `┌─[${timestamp}]────────────`,
            `│  BOT STATUS`,
            "└──────────────────────",
            `Current : ${status}`,
            "───────────────────────",
            "Use 'on' or 'off' to change bot mode.",
            "```",
        ].join("\n");
        return m.reply(info);
    }

    switch (text.toLowerCase()) {
        case "off":
        case "mute":
            if (chat.mute)
                return m.reply('Status : ALREADY OFFLINE');
            chat.mute = true;
            return m.reply('Status : MUTED');
        case "on":
        case "unmute":
            if (!chat.mute)
                return m.reply('Status : ALREADY ONLINE');
            chat.mute = false;
            return m.reply('Status : ONLINE');

        default:
            return m.reply(
                [
                    "```",
                    `┌─[${timestamp}]────────────`,
                    `│  BOT MODE`,
                    "└──────────────────────",
                    `Usage : ${usedPrefix + command} on | off`,
                    "───────────────────────",
                    "Invalid parameter provided.",
                    "```",
                ].join("\n")
            );
    }
};

handler.help = ["botmode"];
handler.tags = ["group"];
handler.command = /^(bot(mode)?)$/i;
handler.owner = true;

export default handler;
