let handler = async (m, { conn }) => {
    let who = m.mentionedJid[0]
        ? m.mentionedJid[0]
        : m.quoted
          ? m.quoted.sender
          : m.fromMe
            ? conn.user.jid
            : m.sender;
    let user = global.db.data.users[who];
    let isSender = who == m.sender;
    if (!user.banned) {
        return m.reply(
            `🍩 *${isSender ? "Kamu" : `@${who.split("@")[0]}`} tidak sedang dibanned kok~*`,
            false,
            { mentions: [who] }
        );
    }
    let now = Date.now();
    let status =
        user.bannedTime == 999
            ? "🍯 *Status: Banned Permanen~*"
            : `🍪 *Sisa Waktu:* ${msToDate(user.bannedTime - now)}`;
    let caption = `
🍓 *Status Banned*
━━━━━━━━━━━━━━
🍬 *User:* ${isSender ? "Kamu" : `@${who.split("@")[0]}`}
${status}
━━━━━━━━━━━━━━
`.trim();
    m.reply(caption, false, { mentions: [who] });
};

handler.help = ["cekbanned"];
handler.tags = ["info"];
handler.command = /^(cek(banned|ban))$/i;

export default handler;

function msToDate(ms) {
    let days = Math.floor(ms / (24 * 60 * 60 * 1000));
    let daysms = ms % (24 * 60 * 60 * 1000);
    let hours = Math.floor(daysms / (60 * 60 * 1000));
    let hoursms = ms % (60 * 60 * 1000);
    let minutes = Math.floor(hoursms / (60 * 1000));
    return `
*${days} Hari*
*${hours} Jam*
*${minutes} Menit*
`.trim();
}
