let handler = async (m, { conn, args, participants, usedPrefix, command }) => {
    let target = m.mentionedJid?.[0] || m.quoted?.sender || null;

    if (!target && args[0] && /^\d{5,}$/.test(args[0])) {
        const num = args[0].replace(/[^0-9]/g, "");
        target = await conn.lidMappingStore.getLIDForPN(num + "@s.whatsapp.net");
    }

    if (!target || !participants.some((p) => p.id === target))
        return m.reply(
            `Specify one valid member to remove.\n› Example: ${usedPrefix + command} @628xxxx`
        );

    try {
        await conn.groupParticipantsUpdate(m.chat, [target], "remove");
        await conn.sendMessage(
            m.chat,
            {
                text: `Successfully removed @${target.split("@")[0]}.`,
                mentions: [target],
            },
            { quoted: m }
        );
    } catch (err) {
        console.error(`Remove failed for ${target}:`, err);
        m.reply("Failed to remove the specified member.");
    }
};

handler.help = ["kick"];
handler.tags = ["group"];
handler.command = /^(kick|k)$/i;
handler.group = true;
handler.botAdmin = true;
handler.admin = true;

export default handler;
