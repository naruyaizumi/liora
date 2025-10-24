let handler = async (m, { conn, text, command, usedPrefix }) => {
    if (!text) return m.reply(`Enter the new bot name.\n› Example: ${usedPrefix + command} Liora`);

    const timestamp = new Date().toTimeString().split(" ")[0];

    try {
        await conn.updateProfileName(text);
        const response = [
            "```",
            `┌─[${timestamp}]────────────`,
            `│  Name Update`,
            "└──────────────────────",
            `Status : Success`,
            `New Name: ${text}`,
            "───────────────────────",
            "WhatsApp bot name updated successfully.",
            "```",
        ].join("\n");

        m.reply(response);
    } catch (e) {
        conn.logger.error(e);
        m.reply(`Error: ${e.message}`);
    }
};

handler.help = ["setnamebot"];
handler.tags = ["owner"];
handler.command = /^set(name(bot)?)$/i;
handler.mods = true;

export default handler;
