let handler = async (m, { conn, args }) => {
    if (!m.quoted) return m.reply("Reply a message to pin.");

    const quotedMsg = m.quoted.copy();
    const { chat } = quotedMsg;
    let duration = 86400; 

    if (args[0]) {
        const input = args[0].toLowerCase();
        if (input.endsWith("d")) duration = parseInt(input) * 86400;
        else if (input.endsWith("h")) duration = parseInt(input) * 3600;
        else if (input.endsWith("m")) duration = parseInt(input) * 60;
    }

    try {
        await conn.sendMessage(chat, {
            pin: {
                type: 1,
                time: duration,
                key: quotedMsg.key
            }
        });
        m.reply(`Message pinned for ${duration} seconds.`);
    } catch (e) {
        conn.logger.error(e);
        m.reply(`Error: ${e.message}`);
    }
};

handler.help = ["pin"];
handler.tags = ["group"];
handler.command = /^pin$/i;
handler.group = true;
handler.admin = true;
handler.botAdmin = true;

export default handler;