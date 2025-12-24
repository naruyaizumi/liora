export async function before(m, { isOwner, isAdmin, isBotAdmin }) {
    if (m.isBaileys || m.fromMe) return true;
    if (isOwner) return true;
    if (!m.isGroup) return true;
    if (isAdmin) return true;
    let chat = global.db.data.chats[m.chat];
    if (!chat) return true;
    if (!chat?.antiVideo || !isBotAdmin) return true;

    if (m.mtype === "videoMessage") {
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
