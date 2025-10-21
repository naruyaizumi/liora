const features = [
    { key: "adminOnly", scope: "chat", name: "Admin Only" },
    { key: "detect", scope: "chat", name: "Detect" },
    { key: "notifgempa", scope: "chat", name: "Notif Gempa" },
    { key: "antiLinks", scope: "chat", name: "Anti Link" },
    { key: "antiStatus", scope: "chat", name: "Anti Status Mention" },
    { key: "antiInteractive", scope: "chat", name: "Anti Interactive" },
    { key: "antiSticker", scope: "chat", name: "Anti Sticker" },
    { key: "antiAudio", scope: "chat", name: "Anti Audio" },
    { key: "antiFile", scope: "chat", name: "Anti File" },
    { key: "antiFoto", scope: "chat", name: "Anti Foto" },
    { key: "antiVideo", scope: "chat", name: "Anti Video" },
    { key: "autoApprove", scope: "chat", name: "Auto Approve" },

    { key: "self", scope: "bot", name: "Self Mode" },
    { key: "gconly", scope: "bot", name: "Group Only" },
    { key: "noprint", scope: "bot", name: "No Print" },
    { key: "autoread", scope: "bot", name: "Auto Read" },
    { key: "restrict", scope: "bot", name: "Restrict" },
    { key: "anticall", scope: "bot", name: "Anti Call" },
    { key: "adReply", scope: "bot", name: "Ad Reply" },
    { key: "noerror", scope: "bot", name: "Hide Error" },
];

function listFeatures(isOwner, chat, bot) {
    const available = isOwner ? features : features.filter((f) => f.scope === "chat");
    return available
        .map((f, i) => {
            const state = f.scope === "chat" ? chat[f.key] : bot[f.key];
            return `${i + 1}. ${f.name} [${state ? "ON" : "OFF"}]`;
        })
        .join("\n");
}

let handler = async (m, { conn, isOwner, isAdmin, args, usedPrefix, command }) => {
    const chat = global.db.data.chats[m.chat];
    const bot = global.db.data.settings[conn.user.jid] || {};

    if (!args[0]) {
        const daftar = listFeatures(isOwner, chat, bot);
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
        const fitur = (isOwner ? features : features.filter((f) => f.scope === "chat"))[i - 1];
        if (!fitur) continue;

        if (fitur.scope === "chat") {
            if (!(isAdmin || isOwner)) continue;
            chat[fitur.key] = enable;
        } else if (fitur.scope === "bot") {
            if (!isOwner) continue;
            bot[fitur.key] = enable;
        }
        results.push(`${fitur.name}: ${enable ? "ON" : "OFF"}`);
    }

    if (!results.length) return m.reply("No features were modified.");
    return m.reply(`Updated features:\n${results.join("\n")}`);
};

handler.help = ["on", "off"];
handler.tags = ["tools"];
handler.command = /^(on|off)$/i;
handler.group = true;

export default handler;
