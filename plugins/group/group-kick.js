let handler = async (m, { conn, args, participants, usedPrefix, command }) => {
    let target = m.mentionedJid?.[0] || m.quoted?.sender || null;

    if (!target && args[0]) {
        const pn = args[0].replace(/[^0-9]/g, "") + "@s.whatsapp.net";
        const lid = await conn.signalRepository.lidMapping.getLIDForPN(pn);
        if (lid) target = lid;
    }

    if (!target && args[0]) {
        const raw = args[0].replace(/[^0-9]/g, "") + "@lid";
        if (participants.some((p) => p.id === raw)) target = raw;
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
    } catch (e) {
        conn.logger.error(e);
        m.reply(`Error: ${e.message}`);
    }
};

handler.help = ["kick"];
handler.tags = ["group"];
handler.command = /^(kick|k)$/i;
handler.group = true;
handler.botAdmin = true;
handler.admin = true;

export default handler;
