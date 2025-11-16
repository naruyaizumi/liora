let handler = async (m, { conn, text, command, usedPrefix }) => {
    if (!text) {
        return m.reply(
            `Enter the new bio text.\nExample: ${usedPrefix + command} I am the best bot owned by Izumi.`
        );
    }

    try {
        await conn.setStatus(text);

        const response = `
New Bio: ${text}
WhatsApp bot bio updated successfully.
`.trim();

        m.reply(response);
    } catch (e) {
        conn.logger.error(e);
        m.reply(`Error: ${e.message}`);
    }
};

handler.help = ["setbiobot"];
handler.tags = ["owner"];
handler.command = /^set(bio(bot)?)$/i;
handler.owner = true;

export default handler;
