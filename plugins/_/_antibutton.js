export async function before(m, { conn }) {
    if (!m.isGroup) return true;
    const chat = global.db.data.chats[m.chat];
    if (!chat?.antiInteractive) return true;

    const interactiveTypes = [
        "buttonsMessage",
        "templateMessage",
        "listMessage",
        "pollUpdateMessage",
        "pollCreationMessage",
        "pollCreationMessageV2",
        "pollCreationMessageV3",
        "groupInviteMessage",
        "groupInviteMessageV2",
        "requestPaymentMessage",
        "paymentInfoMessage",
        "productMessage",
        "orderMessage",
        "locationMessage",
        "liveLocationMessage",
        "eventMessage",
    ];

    const botId = conn.decodeJid(conn.user.id);
    const senderId = conn.decodeJid(m.sender);

    if (interactiveTypes.includes(m.mtype) && senderId !== botId) {
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
