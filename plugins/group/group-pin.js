let handler = async (m, { conn, args, usedPrefix, command }) => {
    if (!m.quoted) return m.reply("Reply a message to pin.");

    if (!args[0]) {
        return m.reply(
            `Specify duration.\n\nExamples:\n` +
                `› ${usedPrefix + command} 1 = 1 day\n` +
                `› ${usedPrefix + command} 2 = 7 days\n` +
                `› ${usedPrefix + command} 3 = 30 days`
        );
    }

    const durations = {
        1: { seconds: 86400, label: "1 day" },
        2: { seconds: 604800, label: "7 days" },
        3: { seconds: 2592000, label: "30 days" },
    };

    const selected = durations[args[0]];
    if (!selected) return m.reply("Invalid option. Use 1, 2, or 3 only.");

    const quotedKey = m.quoted?.vM?.key;
    if (!quotedKey) return m.reply("Cannot pin: quoted message key not found");
    try {
        await conn.sendMessage(m.chat, {
            pin: quotedKey,
            type: 1,
            time: selected.seconds,
        });
        m.reply(`Message pinned for ${selected.label}.`);
    } catch (e) {
        conn.logger.error(e);
        m.reply(`Error: ${e.message}`);
    }
};

handler.help = ["pin"];
handler.tags = ["group"];
handler.command = /^(pin)$/i;
handler.group = true;
handler.admin = true;
handler.botAdmin = true;

export default handler;
