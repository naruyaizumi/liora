let handler = async (m, { text, usedPrefix, command, conn }) => {
    try {
        const s = global.db.data.settings[conn.user.lid] || {};

        if (!text) {
            const st = s.self ? "ON" : "OFF";
            return m.reply(
                `Self mode: ${st}\nUse '${usedPrefix + command} on' or '${usedPrefix + command} off'`
            );
        }

        switch (text.toLowerCase()) {
            case "off":
            case "disable":
                if (!s.self) return m.reply("Already off");
                s.self = false;
                return m.reply("Self mode off");

            case "on":
            case "enable":
                if (s.self) return m.reply("Already on");
                s.self = true;
                return m.reply("Self mode on");

            default:
                return m.reply(`Invalid\nUse: ${usedPrefix + command} on | off`);
        }
    } catch (e) {
        m.reply(`Error: ${e.message}`);
    }
};

handler.help = ["self"];
handler.tags = ["owner"];
handler.command = /^(self(mode)?)$/i;
handler.owner = true;

export default handler;
