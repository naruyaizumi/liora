import { getAIClient } from '../../lib/grpc-client.js';

let handler = async (m, { conn, text, usedPrefix, command }) => {
    let q = m.quoted && (m.quoted.mimetype || m.quoted.mediaType) ? m.quoted : m;
    let mime = (q.msg || q).mimetype || q.mediaType || "";
    
    const userText = text || (q.message ? q.message : '');
    
    if (!userText && !mime) {
        return m.reply(
            `❓ *Cara Penggunaan*\n\n` +
            `📝 *Text:*\n${usedPrefix + command} <pertanyaan>\n\n` +
            `🖼️ *Image/PDF:*\nKirim atau reply media dengan caption:\n${usedPrefix + command} <pertanyaan tentang media>\n\n` +
            `✨ *Contoh:*\n` +
            `• ${usedPrefix + command} Jelaskan quantum computing\n` +
            `• [kirim gambar] ${usedPrefix + command} Apa isi gambar ini?\n` +
            `• [reply PDF] ${usedPrefix + command} Ringkas dokumen ini`
        );
    }
    
    let aiClient;
    let buffer = null;
    let mimeType = '';
    
    try {
        await global.loading(m, conn);
        aiClient = await getAIClient();
        
        const userId = m.sender.split('@')[0];
        const chatId = m.chat;
        
        if (mime && (mime.startsWith('image/') || mime === 'application/pdf')) {
            try {
                console.log(`📥 Downloading media: ${mime}`);
                buffer = await q.download?.();
                
                if (!buffer || buffer.length === 0) {
                    throw new Error('Failed to download media');
                }
                
                mimeType = mime;
                console.log(`Media downloaded: ${buffer.length} bytes`);
                
                if (buffer.length > 32 * 1024 * 1024) {
                    return m.reply('Media terlalu besar. Maksimal 32MB untuk gambar/PDF.');
                }
            } catch (dlError) {
                console.error('Media download error:', dlError);
                return m.reply('Gagal mengunduh media. Coba kirim ulang.');
            }
        }
        
        const requestOptions = {
            userId: userId,
            chatId: chatId,
            message: userText || 'Jelaskan apa yang ada di media ini',
            includeHistory: true,
            maxTokens: 4096,
            temperature: 0.7
        };
        
        if (buffer) {
            requestOptions.mediaBuffer = buffer;
            requestOptions.mimeType = mimeType;
        }
        
        const response = await aiClient.chat(requestOptions);
        
        if (!response.success) {
            return m.reply(`Error: ${response.message}`);
        }
        
        let replyText = response.message.trim();
        
        let footer = '\n\n';
        if (response.fromCache) {
            footer += '💾 _Dari cache_';
        } else {
            footer += `🤖 *Claude Opus 4.5*\n`;
            footer += `📊 Tokens: ${response.tokensUsed}`;
            if (buffer) {
                footer += `\n📎 Media: ${mimeType}`;
            }
        }
        
        replyText += footer;
        
        await conn.sendMessage(
            m.chat,
            { 
                text: replyText,
                mentions: [m.sender]
            },
            { quoted: m }
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
handler.command = /^(ai|claude)$/i;

export default handler;