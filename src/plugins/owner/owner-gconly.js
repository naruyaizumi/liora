let handler = async (m, { text, usedPrefix, command, conn }) => {
    try {
        const s = global.db.data.settings[conn.user.lid] || {};

        if (!text) {
            const st = s.gconly ? "ON" : "OFF";
            return m.reply(
                `GC Only: ${st}\nUse '${usedPrefix + command} on' or '${usedPrefix + command} off'`
            );
        }

        switch (text.toLowerCase()) {
            case "off":
            case "disable":
                if (!s.gconly) return m.reply("Already off");
                s.gconly = false;
                return m.reply("GC Only off");

            case "on":
            case "enable":
                if (s.gconly) return m.reply("Already on");
                s.gconly = true;
                return m.reply("GC Only on");

            default:
                return m.reply(`Invalid\nUse: ${usedPrefix + command} on | off`);
        }
    } catch (e) {
        m.reply(`Error: ${e.message}`);
    }
};

handler.help = ["gconly"];
handler.tags = ["owner"];
handler.command = /^(gconly|grouponly)$/i;
handler.owner = true;

export default handler;
