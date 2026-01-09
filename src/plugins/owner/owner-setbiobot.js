let handler = async (m, { conn, text, command, usedPrefix }) => {
    if (!text) return m.reply(`Set bot bio\nEx: ${usedPrefix + command} I am a bot`);

    await conn.setStatus(text);
    m.reply(`Bio updated: ${text}`);
};

handler.help = ["setbiobot"];
handler.tags = ["owner"];
handler.command = /^set(bio(bot)?)$/i;
handler.owner = true;

export default handler;
