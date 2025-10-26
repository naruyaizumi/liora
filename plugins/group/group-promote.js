let handler = async (m, { conn, args, participants, usedPrefix, command }) => {
    try {
        let target = m.mentionedJid?.[0] || m.quoted?.sender || null;

        if (!target && args[0] && /^\d{5,}$/.test(args[0])) {
            const num = args[0].replace(/[^0-9]/g, "");
            target = await conn.lidMappingStore.getLIDForPN(num + "@s.whatsapp.net");
        }

        if (!target && args[0]) {
            const raw = args[0].replace(/[^0-9]/g, "");
            const lid = raw + "@lid";
            if (participants.some((p) => p.id === lid)) {
                target = lid;
            }
        }

        if (!target || !participants.some((p) => p.id === target))
            throw `Specify one valid member to promote.\n› Example: ${usedPrefix + command} @628xxxx`;

        await conn.groupParticipantsUpdate(m.chat, [target], "promote");

        await conn.sendMessage(
            m.chat,
            {
                text: `Successfully promoted @${target.split("@")[0]}.`,
                mentions: [target],
            },
            { quoted: m }
        );
    } catch (e) {
        conn.logger.error(e);
        m.reply(`Error: ${e.message}`);
    }
};

handler.help = ["promote"];
handler.tags = ["group"];
handler.command = /^(promote)$/i;
handler.group = true;
handler.botAdmin = true;
handler.admin = true;

export default handler;
