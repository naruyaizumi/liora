let handler = async (m, { conn, args, usedPrefix, command }) => {
    const input = args[0];
    const durations = {
        0: { seconds: 0, label: "disabled" },
        1: { seconds: 86400, label: "1 day" },
        2: { seconds: 604800, label: "7 days" },
        3: { seconds: 7776000, label: "90 days" },
    };

    if (!input || !durations[input]) {
        return m.reply(
            `Invalid option.\n\nExamples:\n` +
                `› ${usedPrefix + command} 0 = remove\n` +
                `› ${usedPrefix + command} 1 = 1 day\n` +
                `› ${usedPrefix + command} 2 = 7 days\n` +
                `› ${usedPrefix + command} 3 = 90 days`
        );
    }

    try {
        await conn.groupToggleEphemeral(m.chat, durations[input].seconds);
        m.reply(`Ephemeral messages set to ${durations[input].label}.`);
    } catch (e) {
        conn.logger.error(e);
        m.reply(`Error: ${e.message}`);
    }
};

handler.help = ["ephemeral"];
handler.tags = ["group"];
handler.command = /^(ephemeral)$/i;
handler.group = true;
handler.admin = true;
handler.botAdmin = true;

export default handler;
