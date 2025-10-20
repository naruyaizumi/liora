let handler = async (m, { conn, args, participants, usedPrefix, command }) => {
    let target = m.mentionedJid?.[0] || m.quoted?.sender || null;
    if (!target && args[0] && /^\d{5,}$/.test(args[0])) {
        const num = args[0].replace(/[^0-9]/g, "");
        target = await conn.lidMappingStore.getLIDForPN(num + "@s.whatsapp.net");
    }
    if (!target && args[0]) {
        const raw = args[0].replace(/[^0-9]/g, "");
        const lid = raw + "@lid";
    if (participants.some(p => p.lid === lid)) {
        target = lid;
        }
    }

    if (!target || !participants.some((p) => p.lid === target))
        return m.reply(
            `Specify one valid member to demote.\n› Example: ${usedPrefix + command} @628xxxx`
        );

    try {
        await conn.groupParticipantsUpdate(m.chat, [target], "demote");
        await conn.sendMessage(
            m.chat,
            {
                text: `Successfully demoted @${target.split("@")[0]}.`,
                mentions: [target],
            },
            { quoted: m }
        );
    } catch (err) {
        console.error(`Demote failed for ${target}:`, err);
        m.reply("Failed to demote the specified member.");
    }
};

handler.help = ["demote"];
handler.tags = ["group"];
handler.command = /^(demote)$/i;
handler.group = true;
handler.botAdmin = true;
handler.admin = true;

export default handler;
