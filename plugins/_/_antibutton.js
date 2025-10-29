function checkMessage(obj, interactiveTypes) {
    if (!obj || typeof obj !== "object") return { interactive: false, forwarded: false };
    let interactive = false;
    let forwarded = false;
    const visited = new Set();

    function traverse(o, skipQuoted = false) {
        if (!o || typeof o !== "object" || visited.has(o)) return;
        visited.add(o);
        for (const key of Object.keys(o)) {
            if (skipQuoted && key === "quotedMessage") continue;
            const val = o[key];
            if (interactiveTypes.includes(key)) interactive = true;
            if (val?.contextInfo?.isForwarded) forwarded = true;
            if (typeof val === "object") traverse(val, skipQuoted);
        }
    }

    traverse(obj, true);
    return { interactive, forwarded };
}

export async function before(m, { conn, isOwner, isMods, isAdmin, isBotAdmin }) {
    if (m.isBaileys || m.fromMe) return true;
    if (isOwner || isMods) return true;
    if (!m.isGroup) return true;
    if (isAdmin) return true;
    const chat = global.db.data.chats[m.chat];
    if (!chat?.antiInteractive || !isBotAdmin) return true;

    const interactiveTypes = [
        "buttonsMessage",
        "templateMessage",
        "listMessage",
        "interactiveMessage",
        "pollUpdateMessage",
        "pollCreationMessage",
        "pollCreationMessageV2",
        "pollCreationMessageV3",
        "productMessage",
        "orderMessage",
        "eventMessage",
    ];

    const botId = conn.decodeJid(conn.user.lid);
    const senderId = conn.decodeJid(m.sender);

    const { interactive, forwarded } = checkMessage(m.message, interactiveTypes);

    if ((interactive || forwarded) && senderId !== botId) {
        try {
            await conn.sendMessage(m.chat, {
                delete: {
                    remoteJid: m.chat,
                    fromMe: false,
                    id: m.key.id,
                    participant: m.key.participant || m.sender,
                },
            });
        } catch (e) {
            conn.logger.error(e);
        }
    }

    return true;
}
