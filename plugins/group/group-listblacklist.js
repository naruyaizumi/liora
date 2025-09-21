let handler = async (m) => {
    let chat = global.db.data.chats[m.chat];
    chat.member = chat.member || {};
    let listUser = Object.entries(chat.member).filter(([_, v]) => v.blacklist); // eslint-disable-line no-unused-vars
    if (listUser.length === 0)
        return m.reply("🍩 *Tidak ada user yang masuk daftar blacklist grup ini~*");
    let caption = `
🍓 *List Pengguna yang Terdaftar di Blacklist Grup Ini:*\n
${await Promise.all(
    listUser.map(async ([number, value], i) => {
        let time = formatDate(value.blacklistTime);
        return `🍡 *${i + 1}.* @${number.split("@")[0]}\n🕒 *Masuk blacklist: ${time}*`;
    })
).then((res) => res.join("\n\n"))}
`.trim();
    await m.reply(caption, false, {
        contextInfo: {
            mentionedJid: listUser.map(([number]) => number),
        },
    });
};

handler.help = ["listblacklist"];
handler.tags = ["group"];
handler.command = /^(listblacklist|lbl)$/i;
handler.group = true;
handler.owner = true;

export default handler;

function formatDate(timestamp) {
    let date = new Date(timestamp);
    let options = {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        timeZone: "Asia/Jakarta",
        timeZoneName: "short",
    };
    return date.toLocaleString("id-ID", options).replace("WIB", "").trim();
}
