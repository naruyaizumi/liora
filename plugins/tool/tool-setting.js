const features = [
    { key: "self", scope: "bot", name: "Self Mode" },
    { key: "gconly", scope: "bot", name: "Group Only" },
    { key: "noprint", scope: "bot", name: "No Print" },
    { key: "autoread", scope: "bot", name: "Auto Read" },
    { key: "restrict", scope: "bot", name: "Restrict" },
    { key: "adReply", scope: "bot", name: "Ad Reply" },
    { key: "noerror", scope: "bot", name: "Hide Error" },
];

function listFeatures(bot) {
    return features
        .map((f, i) => {
            const state = bot[f.key];
            return `${i + 1}. ${f.name} [${state ? "ON" : "OFF"}]`;
        })
        .join("\n");
}

let handler = async (m, { conn, args, usedPrefix, command }) => {
    try {
        const bot = global.db.data.settings[conn.user.jid] || {};
        const daftar = listFeatures(bot);

        if (!args[0]) {
            return m.reply(
                `=== Feature Toggle ===
${daftar}

Usage:
› ${usedPrefix + command} 1 2 3 => enable multiple features
› ${usedPrefix + (command === "on" ? "off" : "on")} 4 5 6 => disable features`
            );
        }

        const enable = command === "on";
        const indexes = args.map((n) => parseInt(n)).filter((n) => !isNaN(n));
        if (!indexes.length) return m.reply("Invalid feature number.");

        const results = [];
        for (const i of indexes) {
            const fitur = features[i - 1];
            if (!fitur) continue;
            bot[fitur.key] = enable;
            results.push(`${fitur.name}: ${enable ? "ON" : "OFF"}`);
        }

        if (!results.length) return m.reply("No features were modified.");
        return m.reply(`Updated features:\n${results.join("\n")}`);
    } catch (e) {
        conn.logger.error(e);
        m.reply(`Error: ${e.message}`);
    }
};

handler.help = ["on", "off"];
handler.tags = ["tools"];
handler.command = /^(on|off)$/i;
handler.owner = true;

export default handler;
