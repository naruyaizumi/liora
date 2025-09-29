let handler = async (m, { conn, args, usedPrefix, command }) => {
    let targets = [];
    
    if (m.mentionedJid && m.mentionedJid.length) {
        targets.push(...m.mentionedJid);
    }
    
    for (let arg of args) {
        if (/^\d{5,}$/.test(arg)) {
            let jid = arg.replace(/[^0-9]/g, "") + "@s.whatsapp.net";
            targets.push(jid);
        }
    }

    targets = [...new Set(targets)];

    if (!targets.length)
        return m.reply(`🍡 *Contoh penggunaan: ${usedPrefix + command} 628xxxx*`);

    let msg = `🍓 *Hapus anggota selesai!*\n`;
    for (let target of targets) {
        try {
            let res = await conn.groupParticipantsUpdate(m.chat, [target], "remove");
            if (res[0]?.status === "200") {
                msg += `🧁 *Berhasil dikeluarkan:* @${target.split("@")[0]}\n`;
            } else {
                msg += `🍩 *Gagal mengeluarkan:* @${target.split("@")[0]}\n`;
            }
        } catch (e) {
            console.error(e);
            msg += `🍩 *Error mengeluarkan:* @${target.split("@")[0]}\n`;
        }
        await delay(1500);
    }
    m.reply(msg.trim(), null, { mentions: targets });
};

handler.help = ["kick"];
handler.tags = ["group"];
handler.command = /^(kick|remove|k)$/i;
handler.group = true;
handler.botAdmin = true;
handler.admin = true;

export default handler;

const delay = (ms) => new Promise((res) => setTimeout(res, ms));