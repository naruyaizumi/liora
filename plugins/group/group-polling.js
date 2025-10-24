let handler = async (m, { conn, args, usedPrefix, command }) => {
    const input = args.join(" ");
    if (!input.includes("|"))
        return m.reply(
            `Invalid format.\nExample: ${usedPrefix + command} Who is the most active?|Naruya, Liora, Member`
        );

    const [title, optionsRaw] = input.split("|");
    const options = optionsRaw
        .split(",")
        .map((v) => v.trim())
        .filter(Boolean);

    if (!title || options.length < 2)
        return m.reply("Poll must have a title and at least 2 options.");

    try {
        await conn.sendMessage(m.chat, {
            poll: {
                name: title.trim(),
                values: options,
                selectableCount: 1,
                toAnnouncementGroup: true,
            },
        });
    } catch (e) {
        conn.logger.error(e);
        m.reply(`Error: ${e.message}`);
    }
};

handler.help = ["poll"];
handler.tags = ["group"];
handler.command = /^(poll)$/i;
handler.group = true;
handler.admin = true;
handler.botAdmin = true;

export default handler;
