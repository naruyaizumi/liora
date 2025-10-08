let handler = async (m, { conn, args, participants, usedPrefix, command }) => {
    const targets = [];

    if (m.mentionedJid?.length) targets.push(...m.mentionedJid);
    if (m.quoted?.sender) targets.push(m.quoted.sender);

    for (const arg of args) {
        if (/^\d{5,}$/.test(arg)) {
            targets.push(arg.replace(/[^0-9]/g, "") + "@s.whatsapp.net");
        }
    }

    const validTargets = [...new Set(targets)].filter(
        (v) => v !== m.sender && participants.some((p) => p.id === v)
    );

    if (!validTargets.length)
        return m.reply(`Specify members to demote.\n› Example: ${usedPrefix + command} @628xxxx`);

    await Promise.allSettled(
        validTargets.map(async (target) => {
            try {
                await conn.groupParticipantsUpdate(m.chat, [target], "demote");
            } catch (err) {
                console.error(`Demote failed for ${target}:`, err);
            }
            await delay(1500);
        })
    );

    return m.reply(`Demotion process completed.`);
};

handler.help = ["demote"];
handler.tags = ["group"];
handler.command = /^(demote)$/i;
handler.group = true;
handler.botAdmin = true;
handler.admin = true;

export default handler;

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
