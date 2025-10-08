const linkRegex = /(https?:\/\/[^\s]+|www\.[^\s]+|\b(?:[a-z0-9-]+\.)+[a-z]{2,})(\/[^\s]*)?/gi;
let deleteQueue = Promise.resolve();

export async function before(m, { isAdmin, isBotAdmin, isMods }) {
    const isOwner = global.config.owner.some(([number]) => m.sender.includes(number));
    if (m.isBaileys || m.fromMe || isOwner || isAdmin || isMods) return true;
    let chat = global.db.data.chats[m.chat];
    if (!chat) return true;
    if (!chat.antiLinks || !m.isGroup) return;
    if (!isBotAdmin) return true;
    const msgContent =
        m.text ||
        m.message?.extendedTextMessage?.text ||
        m.message?.imageMessage?.caption ||
        m.message?.videoMessage?.caption ||
        "";
    const links = msgContent.match(linkRegex);
    if (links && links.length > 0) {
        deleteQueue = deleteQueue.then(async () => {
            try {
                await this.sendMessage(m.chat, {
                    delete: {
                        remoteJid: m.chat,
                        fromMe: false,
                        id: m.key.id,
                        participant: m.key.participant || m.sender,
                    },
                });
                await new Promise((resolve) => setTimeout(resolve, 300));
            } catch (e) {
                console.error(e);
            }
        });
    }
    return true;
}
