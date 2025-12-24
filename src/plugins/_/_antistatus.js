export async function before(m, { isOwner, isAdmin, isBotAdmin }) {
    if (!m.isGroup) return true;
    if (isOwner) return true;
    if (isAdmin) return true;
    let chat = global.db.data.chats[m.chat];
    if (!chat) return true;
    if (!chat?.antiStatus || !isBotAdmin) return true;

    if (m.mtype === "groupStatusMentionMessage") {
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
            global.logger.error(e);
        }
    }

    return true;
}
