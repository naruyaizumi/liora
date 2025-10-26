let handler = async (m, { conn, args, usedPrefix, command }) => {
    let target = m.quoted?.sender || null;

    if (!target && args[0]) {
        const raw = args[0].replace(/[^0-9]/g, "");
        if (raw.length >= 5) {
            target = raw + "@s.whatsapp.net";
        }
    }

    if (!target || !target.endsWith("@s.whatsapp.net")) {
        return m.reply(
            `Specify one valid member to add.\n› Example: ${usedPrefix + command} 6281234567890`
        );
    }

    try {
        const result = await conn.groupParticipantsUpdate(m.chat, [target], "add");
        const userResult = result?.[0];

        if (userResult?.status === "200") {
            return await conn.sendMessage(
                m.chat,
                {
                    text: `Successfully added @${target.split("@")[0]}.`,
                    mentions: [target],
                },
                { quoted: m }
            );
        } else {
            return m.reply(`Failed to add the member.`);
        }
    } catch (e) {
        conn.logger.error(e);
        return m.reply(`Error: ${e.message}`);
    }
};

handler.help = ["add"];
handler.tags = ["group"];
handler.command = /^(add)$/i;
handler.group = true;
handler.botAdmin = true;
handler.admin = true;

export default handler;
