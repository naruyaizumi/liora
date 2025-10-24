export async function before(m, { conn }) {
    if (!m.isGroup) return true;
    const chat = global.db.data.chats[m.chat];
    if (!chat?.antiInteractive) return true;
    if (
        m.mtype === "buttonsResponseMessage" ||
        m.mtype === "listResponseMessage" ||
        m.mtype === "templateButtonReplyMessage"
    ) {
        const botId = this.decodeJid(this.user.id);
        const senderId = this.decodeJid(m.sender);
        if (senderId === botId) return true;
        try {
            await this.sendMessage(m.chat, {
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
