let handler = async (m, { conn, args, usedPrefix, command }) => {
    let target;

    if (m.mentionedJid?.[0]) target = m.mentionedJid[0];
    else if (m.quoted?.sender) target = m.quoted.sender;
    else if (args[0] && /^\d{5,}$/.test(args[0])) {
        const num = args[0].replace(/[^0-9]/g, "");
        target = await conn.lidMappingStore.getLIDForPN(num + "@s.whatsapp.net");
    }

    if (!target)
        return m.reply(
            `Specify one valid number or mention to add.\n› Example: ${usedPrefix + command} 628xxxx`
        );

    try {
        await conn.groupParticipantsUpdate(m.chat, [target], "add");
        await conn.sendMessage(m.chat, {
            text: `Successfully added @${target.split("@")[0]} to the group.`,
            mentions: [target],
        }, { quoted: m });
    } catch (err) {
        console.error(`Add failed for ${target}:`, err);
        m.reply("Failed to add the specified member.");
    }
};

handler.help = ["add"];
handler.tags = ["group"];
handler.command = /^(add)$/i;
handler.group = true;
handler.botAdmin = true;
handler.admin = true;

export default handler;