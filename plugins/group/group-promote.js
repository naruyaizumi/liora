let handler = async (m, { conn, args, participants, usedPrefix, command }) => {
    let targets = [];

    if (m.mentionedJid && m.mentionedJid.length) {
        targets.push(...m.mentionedJid);
    }

    if (m.quoted && m.quoted.sender) {
        targets.push(m.quoted.sender);
    }

    for (let arg of args) {
        if (/^\d{5,}$/.test(arg)) {
            targets.push(arg.replace(/[^0-9]/g, "") + "@s.whatsapp.net");
        }
    }

    targets = [...new Set(targets)].filter(
        (v) => v !== m.sender && participants.some((p) => p.id === v)
    );

    if (!targets.length) {
        return m.reply(
            `🍡 *Tag atau reply anggota yang ingin dipromote*\n*Contoh: ${usedPrefix + command} @628xx*`
        );
    }

    for (let target of targets) {
        try {
            await conn.groupParticipantsUpdate(m.chat, [target], "promote");
        } catch (e) {
            console.error(e);
        }
        await delay(1500);
    }
};

handler.help = ["promote"];
handler.tags = ["group"];
handler.command = /^(promote)$/i;
handler.group = true;
handler.botAdmin = true;
handler.admin = true;

export default handler;

const delay = (ms) => new Promise((res) => setTimeout(res, ms));