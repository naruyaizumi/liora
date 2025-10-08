export async function before(m, { conn, isAdmin, isBotAdmin, isOwner, isMods }) {
    if (m.isBaileys && m.fromMe) return true;
    if (isOwner || isAdmin || isMods) return true;
    let chat = global.db.data.chats[m.chat];
    if (!chat) return true;
    if (!chat.antiFoto || !isBotAdmin) return true;
    if (m.mtype === "imageMessage") {
        await conn.sendMessage(m.chat, {
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
