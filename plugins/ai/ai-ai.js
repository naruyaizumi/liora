import { getAIClient } from '../../lib/grpc-client.js';

let handler = async (m, { conn, text, usedPrefix, command }) => {
    if (!text || typeof text !== "string") {
        return m.reply(
            `Please provide a valid query.\nExample: ${ usedPrefix + command } Explain quantum computing`
        );
    }

    let aiClient;
    try {
        await global.loading(m, conn);
        aiClient = await getAIClient();

        let q = m.quoted && (m.quoted.mimetype || m.quoted.mediaType) ? m.quoted : m;
        let mime = (q.msg || q).mimetype || q.mediaType || "";
        let mediaBuffer = null;

        if (q && typeof q.download === "function") {
            try {
                mediaBuffer = await q.download?.();
            } catch (err) {
                console.error('media download error', err);
                mediaBuffer = null;
            }
        }

        const userId = m.sender.split('@')[0];
        const chatId = m.chat;
        const response = await aiClient.chat({
            userId: userId,
            chatId: chatId,
            message: text,
            includeHistory: true,
            maxTokens: 2000,
            temperature: 0.7,
            mediaBuffer: mediaBuffer,
            mediaMime: mime
        });

        if (!response.success) {
            return m.reply(`Error: ${response.message}`);
        }

        await conn.sendMessage(
            m.chat, { text: response.message.trim() }, { quoted: m }
        );

    } catch (e) {
        conn.logger.error(e);
        m.reply(`Error: ${e.message}`);
    } finally {
        await global.loading(m, conn, true);
    }
};

handler.help = ["ai"];
handler.tags = ["ai"];
handler.command = /^(ai)$/i;

export default handler;
