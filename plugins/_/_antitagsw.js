export async function before(m, { isAdmin, isMods }) {
    let isOwner = global.config.owner.some(([number]) => m.sender.includes(number));
    if (isOwner || isAdmin || isMods) return true;
    let chat = global.db.data.chats[m.chat];
    if (!chat) return true;
    if (!chat.antitagsw) return true;
    let msg = m.message;
    if (msg?.groupStatusMentionMessage) {
        await this.sendMessage(m.chat, {
            delete: {
                remoteJid: m.chat,
                fromMe: false,
                id: m.key.id,
                participant: m.key.participant,
            },
        });
    }

    return true;
}
