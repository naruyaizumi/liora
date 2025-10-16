let handler = async (m, { conn, args, participants, usedPrefix, command }) => {
    let target;

    if (m.mentionedJid?.length) target = m.mentionedJid[0];
    else if (m.quoted?.sender) target = m.quoted.sender;
    else if (args[0]) {
        const num = args[0].replace(/[^0-9]/g, "");
        if (num) target = await conn.lidMappingStore.getLIDForPN(num + "@s.whatsapp.net");
    }

    if (!target)
        return m.reply(
            `Specify one valid member to promote.\n› Example: ${usedPrefix + command} @628xxxx`
        );

    const exists = participants.some((p) => p.id === target);
    if (!exists) return m.reply("User is not a member of this group.");

    try {
        await conn.groupParticipantsUpdate(m.chat, [target], "promote");
        await conn.sendMessage(
            m.chat,
            {
                text: `Successfully promoted @${target.split("@")[0]}.`,
                mentions: [target],
            },
            { quoted: m }
        );
    } catch (err) {
        console.error(`Promote failed for ${target}:`, err);
        m.reply("Failed to promote the specified member.");
    }
};

handler.help = ["promote"];
handler.tags = ["group"];
handler.command = /^(promote)$/i;
handler.group = true;
handler.botAdmin = true;
handler.admin = true;

export default handler;
