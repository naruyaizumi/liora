let handler = async (m, { conn }) => {
    let user = global.db.data.users;
    let member = Object.keys(user)
        .filter((v) => typeof user[v].commandTotal != "undefined" && v != conn.user.jid)
        .sort((a, b) => {
            const totalA = user[a].command;
            const totalB = user[b].command;
            return totalB - totalA;
        });
    let nomor = 1;
    let commandToday = 0;
    let commandTotal = 0;
    for (let number of member) {
        commandToday += user[number].command;
        commandTotal += user[number].commandTotal;
    }
    let head = `🍙 *Total command hari ini: ${toRupiah(commandToday)}*\n🍜 *Total semua command:* ${toRupiah(commandTotal)}\n\n`;
    let caption = "";
    for (let i = 0; i < Math.min(10, member.length); i++) {
        if (typeof user[member[i]] != "undefined") {
            caption += `🍩 *${nomor++}. ${conn.getName(member[i])}*\n`;
            caption += `🍡 *Command Hari Ini: ${toRupiah(user[member[i]].command)}*\n`;
            caption += `🍤 *Total Command: ${toRupiah(user[member[i]].commandTotal)}*\n`;
            caption += `🍱 *Terakhir Command: ${getTime(user[member[i]].lastseen)}*\n\n`;
        }
    }
    await m.reply(head + caption.trim());
};

handler.help = ["totalcommand"];
handler.tags = ["info"];
handler.command = /^(totalcommand(all)?)$/i;
handler.owner = true;

export default handler;

export function parseMs(ms) {
    if (typeof ms !== "number") throw "Parameter harus berupa angka";
    return {
        days: Math.trunc(ms / 86400000),
        hours: Math.trunc(ms / 3600000) % 24,
        minutes: Math.trunc(ms / 60000) % 60,
        seconds: Math.trunc(ms / 1000) % 60,
    };
}

export function getTime(ms) {
    let now = parseMs(+new Date() - ms);
    if (now.days) return `${now.days} hari lalu 🍙`;
    else if (now.hours) return `${now.hours} jam lalu 🍜`;
    else if (now.minutes) return `${now.minutes} menit lalu 🍤`;
    else return `beberapa detik lalu 🍡`;
}

const toRupiah = (number) => parseInt(number).toLocaleString("id-ID").replace(/,/gi, ".");
