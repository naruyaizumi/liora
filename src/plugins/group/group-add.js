let handler = async (m, { conn, args, usedPrefix, command }) => {
    let target = m.quoted?.sender || null;

    if (!target && args[0]) {
        const num = args[0].replace(/[^0-9]/g, "");
        if (num.length >= 5) target = num + "@s.whatsapp.net";
    }

    if (!target?.endsWith("@s.whatsapp.net")) {
        return m.reply(`Add member\nEx: ${usedPrefix + command} 6281234567890`);
    }

    try {
        const res = await conn.groupParticipantsUpdate(m.chat, [target], "add");
        const user = res?.[0];

        if (user?.status === "200") {
            return conn.sendMessage(
                m.chat,
                {
                    text: `Added @${target.split("@")[0]}`,
                    mentions: [target],
                },
                { quoted: m }
            );
        }

        return m.reply(`Failed to add. Status: ${user?.status || "unknown"}`);
    } catch (e) {
        return m.reply(`Error: ${e.message}`);
    }
};

handler.help = ["add"];
handler.tags = ["group"];
handler.command = /^(add)$/i;
handler.group = true;
handler.botAdmin = true;
handler.admin = true;

export default handler;
