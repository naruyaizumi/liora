let handler = async (m, { conn, usedPrefix, command, args }) => {
    conn.arona = conn.arona || {};

    if (!args[0]) {
        return m.reply(`Example: ${usedPrefix + command} on / off`);
    }
    if (args[0].toLowerCase() === "on") {
        conn.arona[m.chat] = {
            active: true,
        };
        return m.reply(
            "Arona has been activated!\nNow you can chat directly with her, Sensei~ >w<"
        );
    }
    if (args[0].toLowerCase() === "off") {
        delete conn.arona[m.chat];
        return m.reply(
            "Arona is turned off.\nShe will take a break from her duties as an assistant."
        );
    }
    return m.reply('The options are only "on" or "off", Sensei~');
};

handler.help = ["arona"];
handler.tags = ["ai"];
handler.command = /^(arona)$/i;
handler.owner = true;

export default handler;
