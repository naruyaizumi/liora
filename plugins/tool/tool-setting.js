let handler = async (m, { conn, isOwner, isAdmin, args, usedPrefix, command }) => {
    let chat = global.db.data.chats[m.chat];
    let bot = global.db.data.settings[conn.user.jid] || {};

    let features = [
        { key: "adminOnly", scope: "chat", name: "Admin Only" },
        { key: "detect", scope: "chat", name: "Detect" },
        { key: "otakuNews", scope: "chat", name: "Otaku News" },
        { key: "notifgempa", scope: "chat", name: "Notif Gempa" },
        { key: "antidelete", scope: "chat", name: "Anti Delete" },
        { key: "antiLinks", scope: "chat", name: "Anti Link" },
        { key: "antitagsw", scope: "chat", name: "Anti Tag SW" },
        { key: "antiSticker", scope: "chat", name: "Anti Sticker" },
        { key: "antiAudio", scope: "chat", name: "Anti Audio" },
        { key: "antiFile", scope: "chat", name: "Anti File" },
        { key: "antiFoto", scope: "chat", name: "Anti Foto" },
        { key: "antiVideo", scope: "chat", name: "Anti Video" },
        { key: "autoApprove", scope: "chat", name: "Auto Approve" },
        { key: "teks", scope: "chat", name: "Respond Text" },

        { key: "self", scope: "bot", name: "Self Mode" },
        { key: "gconly", scope: "bot", name: "Group Only" },
        { key: "queque", scope: "bot", name: "Antrian Pesan" },
        { key: "noprint", scope: "bot", name: "No Print" },
        { key: "autoread", scope: "bot", name: "Auto Read" },
        { key: "composing", scope: "bot", name: "Composing" },
        { key: "restrict", scope: "bot", name: "Restrict" },
        { key: "backup", scope: "bot", name: "Auto Backup" },
        { key: "cleartmp", scope: "bot", name: "Clear Tmp File" },
        { key: "anticall", scope: "bot", name: "Anti Call" },
        { key: "adReply", scope: "bot", name: "Ad Reply Mode" },
        { key: "noerror", scope: "bot", name: "Hide Error Mode" },
    ];

    let raw = m.selectedButtonId || m.text || "";
    let [cmd, mode, fiturKey] = raw.trim().split(" ");
    if (cmd === ".setting" && fiturKey) {
        let fitur = features.find((f) => f.key === fiturKey);
        if (!fitur) return m.reply("🔥 *Fitur tidak ditemukan.*");
        if (!["enable", "disable"].includes(mode))
            return m.reply(
                `🔥 *Format salah. Gunakan: ${usedPrefix + command} enable|disable [fitur]*`
            );
        let isEnable = mode === "enable";
        if (fitur.scope === "chat") {
            if (!(isAdmin || isOwner)) return global.dfail("admin", m, conn);
            chat[fitur.key] = isEnable;
        } else if (fitur.scope === "bot") {
            if (!isOwner) return global.dfail("owner", m, conn);
            bot[fitur.key] = isEnable;
        }
        return m.reply(
            `🍡 *Fitur ${fitur.name} sekarang ${isEnable ? "AKTIF 🍱" : "NONAKTIF 🍚"}!*`
        );
    }
    if (!args[0]) {
        let availableFeatures = isOwner ? features : features.filter((f) => f.scope === "chat");
        let buttons = [
            {
                name: "single_select",
                buttonParamsJson: JSON.stringify({
                    title: "🍙 Enable Features",
                    sections: [
                        {
                            title: isOwner ? "🍜 All Features" : "🍜 Chat Features Only",
                            rows: availableFeatures.map((f) => {
                                let aktif = f.scope === "chat" ? chat[f.key] : bot[f.key];
                                return {
                                    header: aktif ? "🧊 Active" : "🔥 Inactive",
                                    title: `${f.name} 🍘`,
                                    description: aktif
                                        ? `🍱 Currently active`
                                        : `🍚 Currently inactive`,
                                    id: `.setting enable ${f.key}`,
                                };
                            }),
                        },
                    ],
                }),
            },
            {
                name: "single_select",
                buttonParamsJson: JSON.stringify({
                    title: "🍤 Disable Features",
                    sections: [
                        {
                            title: isOwner ? "🍣 All Features" : "🍣 Chat Features Only",
                            rows: availableFeatures.map((f) => {
                                let aktif = f.scope === "chat" ? chat[f.key] : bot[f.key];
                                return {
                                    header: aktif ? "🧊 Active" : "🔥 Already Off",
                                    title: `${f.name} 🍥`,
                                    description: aktif
                                        ? `🍛 Click to disable`
                                        : `🍚 Already inactive`,
                                    id: `.setting disable ${f.key}`,
                                };
                            }),
                        },
                    ],
                }),
            },
        ];
        return conn.sendMessage(
            m.chat,
            {
                text: "🍽️ *Silakan pilih fitur yang ingin kamu aktifkan/nonaktifkan:*",
                footer: "*Interactive Settings Menu* 🍱",
                title: "🍱 Bot Settings Menu",
                interactive: buttons,
            },
            { quoted: m }
        );
    }
};

handler.help = ["setting"];
handler.tags = ["tools"];
handler.command = /^(setting)$/i;
handler.group = true;

export default handler;
