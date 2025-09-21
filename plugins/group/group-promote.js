let handler = async (m, { conn, args, participants, command, usedPrefix }) => {
    let targets = [];
    if (m.mentionedJid.length) targets.push(...m.mentionedJid);
    if (m.quoted && m.quoted.sender) targets.push(m.quoted.sender);
    for (let arg of args) {
        if (/^\d{5,}$/.test(arg)) {
            let jid = arg.replace(/[^0-9]/g, "") + "@s.whatsapp.net";
            targets.push(jid);
        }
    }
    targets = [...new Set(targets)].filter((v) => participants.some((p) => p.id === v));
    if (!targets.length) {
        return m.reply(
            `🍩 *Masukkan nomor, tag, atau reply pengguna yang ingin dijadikan admin ya sayang~*\n\n*Contoh: ${usedPrefix + command} @628xx*`
        );
    }
    await conn.groupParticipantsUpdate(m.chat, targets, "promote");
};

handler.help = ["promote"];
handler.tags = ["group"];
handler.command = /^(promote)$/i;
handler.group = true;
handler.admin = true;
handler.botAdmin = true;

export default handler;
