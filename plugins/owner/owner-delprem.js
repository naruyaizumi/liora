let handler = async (m, { usedPrefix, command, text }) => {
    let who =
        m.mentionedJid?.[0] ||
        m.quoted?.sender ||
        (text ? text.replace(/[^0-9]/g, "") + "@s.whatsapp.net" : false);
    if (!who)
        return m.reply(
            `🍓 *Tag atau masukkan nomornya dulu ya sayang~*

*Contoh: ${usedPrefix + command}* @${m.sender.split`@`[0]}`
        );
    let user = global.db.data.users[who];
    if (!user || !user.premium)
        return m.reply(`⚠️ *User ini tidak memiliki status premium aktif!*`);
    user.premium = false;
    user.premiumTime = 0;
    await m.reply(
        `💔 *Status Premium ${user.name} telah dicabut~*
*Semoga bisa join premium lagi nanti yaa...*`,
        false,
        { mentions: [who] }
    );
};

handler.help = ["delprem"];
handler.tags = ["owner"];
handler.command = /^(-|del)p(rem)?$/i;
handler.owner = true;

export default handler;
