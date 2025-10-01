let handler = async (m) => {
    let user = global.db.data.users;
    let jumlah = 0;
    for (let id in user) {
        if (typeof user[id] === "object") {
            user[id].command = 0;
            if (!user[id].commandLimit || user[id].commandLimit < 1000) {
                user[id].commandLimit = 1000;
            }
            user[id].cmdLimitMsg = 0;
            jumlah++;
        }
    }
    await m.reply(
        `🌸 *Sukses mereset penggunaan command ${jumlah} user. Limit di bawah 1000 otomatis diset ke 1000.*`
    );
};

handler.help = ["resetcommand"];
handler.tags = ["owner"];
handler.command = /^(resetcommand)$/i;
handler.owner = true;

export default handler;
