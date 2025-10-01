let handler = async (m, { text, conn, usedPrefix, command }) => {
    let why = `🍩 *Contoh: ${usedPrefix + command} @${m.sender.split("@")[0]}*`;
    let who = m.mentionedJid[0]
        ? m.mentionedJid[0]
        : m.quoted
          ? m.quoted.sender
          : text
            ? text.replace(/[^0-9]/g, "") + "@s.whatsapp.net"
            : false;
    if (!who) return conn.reply(m.chat, why, m, { mentions: [m.sender] });
    let res = [];
    switch (command) {
        case "blok":
        case "block":
            await conn.updateBlockStatus(who, "block").then(() => {
                res.push(who);
            });
            break;
        case "unblok":
        case "unblock":
            await conn.updateBlockStatus(who, "unblock").then(() => {
                res.push(who);
            });
            break;
    }
    if (res[0])
        conn.reply(
            m.chat,
            `🍓 *Sukses ${command} ${res.map((v) => "@" + v.split("@")[0]).join(", ")}*`,
            m,
            { mentions: res }
        );
};

handler.help = ["block", "unblock"];
handler.tags = ["owner"];
handler.command = /^(block|unblock)$/i;
handler.owner = true;

export default handler;
