let handler = async (m) => {
    let arr = Object.entries(global.db.data.chats)
        .filter(([, chat]) => typeof chat === "object" && "member" in chat)
        .map(([id]) => id);

    for (let id of arr) {
        global.db.data.chats[id].member = {};
    }
    let users = global.db.data.users;
    let count = 0;
    for (let id in users) {
        if (
            Object.prototype.hasOwnProperty.call(users, id) &&
            typeof users[id].chat !== "undefined"
        ) {
            users[id].chat = 0;
            count++;
        }
    }
    await m.reply(
        `🍓 *Sukses reset:*
🍩 *Data member dari ${arr.length} chat/grup*
🧁 *Data chat harian dari ${count} user*`
    );
};

handler.help = ["resetchat"];
handler.tags = ["owner"];
handler.command = /^(resetchat)$/i;
handler.owner = true;

export default handler;
