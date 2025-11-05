let handler = async (m, { conn, args, usedPrefix, command }) => {
    try {
        let target = m.mentionedJid?.[0] || m.quoted?.sender || null;

        if (!target && args[0] && /^\d{5,}$/.test(args[0])) {
            const pn = args[0].replace(/[^0-9]/g, "") + "@s.whatsapp.net";
            const lid = await conn.signalRepository.lidMapping.getLIDForPN(pn);
            target = lid || pn;
        }

        if (!target && args[0]) {
            const raw = args[0].replace(/[^0-9]/g, "") + "@lid";
            target = raw;
        }

        if (!target) {
            throw `Specify one valid JID to block.\n› Example: ${usedPrefix + command} @628xxxx`;
        }

        await conn.updateBlockStatus(target, "block");

        await conn.sendMessage(
            m.chat,
            {
                text: `Successfully blocked @${target.split("@")[0]}.`,
                mentions: [target],
            },
            { quoted: m }
        );
    } catch (e) {
        conn.logger.error(e);
        m.reply(`Error: ${e.message}`);
    }
};

handler.help = ["block"];
handler.tags = ["owner"];
handler.command = /^block$/i;
handler.owner = true;

export default handler;
