let handler = async (m, { conn, args, usedPrefix, command }) => {
    let targets = [];
    for (let arg of args) {
        if (/^\d{5,}$/.test(arg)) {
            let jid = arg.replace(/[^0-9]/g, "") + "@s.whatsapp.net";
            targets.push(jid);
        }
    }
    targets = [...new Set(targets)];
    if (!targets.length)
        return m.reply(`🍡 *Contoh penggunaan: ${usedPrefix + command} 628xxxx 628xxxx*`);

    for (let target of targets) {
        try {
            await conn.groupParticipantsUpdate(m.chat, [target], "add");
        } catch (e) {
            console.error(e);
        }
        await delay(1500);
    }
};

handler.help = ["add"];
handler.tags = ["group"];
handler.command = /^(add)$/i;
handler.group = true;
handler.botAdmin = true;
handler.admin = true;

export default handler;

const delay = (ms) => new Promise((res) => setTimeout(res, ms));