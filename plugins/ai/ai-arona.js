let handler = async (m, { conn, usedPrefix, command, args }) => {
    conn.arona = conn.arona || {};

    try {
        if (!args[0]) {
            m.reply(`Example: ${usedPrefix + command} on / off`);
            return;
        }

        if (args[0].toLowerCase() === "on") {
            conn.arona[m.chat] = {
                active: true,
            };
            m.reply(
                "Arona has been activated!\nNow you can chat directly with her, Sensei~ >w<"
            );
            return;
        }

        if (args[0].toLowerCase() === "off") {
            delete conn.arona[m.chat];
            m.reply(
                "Arona is turned off.\nShe will take a break from her duties as an assistant."
            );
            return;
        }

        m.reply('The options are only "on" or "off", Sensei~');
    } catch (e) {
        conn.logger.error(e);
    }
};

handler.help = ["arona"];
handler.tags = ["ai"];
handler.command = /^(arona)$/i;
handler.owner = true;

export default handler;