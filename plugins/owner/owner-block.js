let handler = async (m, { conn, args, participants, usedPrefix, command }) => {
    try {
        let target = m.mentionedJid?.[0] || m.quoted?.sender || null;

        if (!target && args[0] && /^\d{5,}$/.test(args[0])) {
            const num = args[0].replace(/[^0-9]/g, "");
            target = await conn.signalRepository.lidMapping.getLIDForPN(num + "@s.whatsapp.net");
        }

        if (!target && args[0]) {
            const raw = args[0].replace(/[^0-9]/g, "");
            const lid = raw + "@lid";
            if (participants.some((p) => p.lid === lid)) target = lid;
        }

        if (!target)
            return m.reply(
                `Specify one valid WhatsApp number to ${command}.\n› Example: ${usedPrefix + command} @628xxxx`
            );

        const decoded = conn.decodeJid(target);
        const blocklist = await conn.fetchBlocklist();
        const isBlocked = blocklist.includes(decoded);

        if (command === "block" && isBlocked)
            return m.reply(`@${decoded.split("@")[0]} is already blocked.`);
        if (command === "unblock" && !isBlocked)
            return m.reply(`@${decoded.split("@")[0]} is not blocked.`);

        await conn.updateBlockStatus(decoded, command === "block" ? "block" : "unblock");

        await conn.sendMessage(
            m.chat,
            {
                text: `${command.toUpperCase()} successful for @${decoded.split("@")[0]}`,
                mentions: [decoded],
            },
            { quoted: m }
        );
    } catch (e) {
        conn.logger.error(e);
        m.reply(`Error: ${e.message}`);
    }
};

handler.help = ["block", "unblock"];
handler.tags = ["owner"];
handler.command = /^(block|unblock)$/i;
handler.owner = true;

export default handler;
