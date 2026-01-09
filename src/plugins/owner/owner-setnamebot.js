let handler = async (m, { conn, text, command, usedPrefix }) => {
    if (!text) return m.reply(`Set bot name\nEx: ${usedPrefix + command} Liora`);

    await conn.updateProfileName(text);
    m.reply(`Name updated: ${text}`);
};

handler.help = ["setnamebot"];
handler.tags = ["owner"];
handler.command = /^set(name(bot)?)$/i;
handler.owner = true;

export default handler;
