let handler = async (m, { usedPrefix, command, text }) => {
    let who = m.mentionedJid[0]
        ? m.mentionedJid[0]
        : m.quoted
          ? m.quoted.sender
          : text
            ? text.replace(/[^0-9]/g, "") + "@s.whatsapp.net"
            : false;
    if (!who)
        return m.reply(
            `🍓 *Reply atau tag orangnya*\n*Contoh: ${usedPrefix + command}* @${m.sender.split("@")[0]}`,
            false,
            { mentions: [m.sender] }
        );
    let chat = global.db.data.chats[m.chat];
    chat.member = chat.member || {};
    let user = (chat.member[who] = chat.member[who] || {});
    if (user.blacklist)
        return m.reply(
            `🍎 @${who.split("@")[0]} *sudah ada di daftar blacklist grup ini!*`,
            false,
            { mentions: [who] }
        );
    user.blacklist = true;
    user.blacklistTime = new Date() * 1;
    m.reply(
        `🍩 *Berhasil~*\n@${who.split("@")[0]} *telah dimasukkan ke dalam blacklist grup ini!*.`,
        false,
        { mentions: [who] }
    );
};

handler.help = ["blacklist"];
handler.tags = ["group"];
handler.command = /^(blacklist(user)?)$/i;
handler.group = true;
handler.owner = true;

export default handler;
