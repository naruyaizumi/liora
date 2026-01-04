import { BufferJSON } from "baileys";
import { fileType, getCategory, getExtension, formatBytes } from "#lib/file-type.js";

let handler = async (m, { conn }) => {
    if (!m.quoted) return;
    
    const q = m.quoted;
    
    const found = (function find(obj, seen = new WeakSet()) {
        if (!obj || typeof obj !== "object") return null;
        if (seen.has(obj)) return null;
        seen.add(obj);
        
        if (obj.url || obj.directPath) {
            let type = null;
            if (obj.mimetype) {
                if (obj.mimetype.startsWith('image/')) {
                    if (obj.mimetype === 'image/webp') {
                        type = 'sticker';
                    } else {
                        type = 'image';
                    }
                } else if (obj.mimetype.startsWith('video/')) {
                    type = 'video';
                } else if (obj.mimetype.startsWith('audio/')) {
                    type = 'audio';
                } else {
                    type = 'document';
                }
            }
            
            if (type) return { node: obj, type };
        }
        
        const mediaPropKeys = ['_mediaMsg', 'message',
            'mediaMessage', 'documentMessage',
            'imageMessage', 'videoMessage', 'audioMessage',
            'stickerMessage'
        ];
        for (const prop of mediaPropKeys) {
            if (obj[prop] && typeof obj[prop] === 'object') {
                const result = find(obj[prop], seen);
                if (result) return result;
            }
        }
        
        for (const k of Object.keys(obj)) {
            try {
                const v = obj[k];
                if (v && typeof v === "object") {
                    const r = find(v, seen);
                    if (r) return r;
                }
            } catch {}
        }
        return null;
    })(q);
    
    if (!found) {
        if (q.text) {
            const debugInfo = `📄 DEBUG INFO - TEXT

📦 MESSAGE DATA:
• Type: text
• Length: ${q.text.length} characters
• Text Preview: ${q.text.substring(0, 100)}${q.text.length > 100 ? '...' : ''}

📋 FULL DATA:
${inspect(q)}
`.trim();
            
            return conn.sendMessage(
                m.chat, { text: debugInfo }, { quoted: m }
            );
        }
        
        const debugInfo = `📄 DEBUG INFO - NO MEDIA FOUND

📦 MESSAGE DATA:
• Type: unknown
• Has Text: ${!!q.text}
• Text Length: ${q.text?.length || 0}

📋 FULL DATA:
${inspect(q)}
`.trim();
        
        return conn.sendMessage(
            m.chat, { text: debugInfo }, { quoted: m }
        );
    }
    
    const { node, type } = found;
    
    const sendMediaTypes = ['image', 'video', 'document'];
    let buffer = null;
    
    if (sendMediaTypes.includes(type)) {
        try {
            buffer = await conn.downloadM(node, type);
        } catch {
            if (q.download && typeof q.download === 'function') {
                try {
                    buffer = await q.download();
                } catch {
                    //
                }
            }
        }
    }
    
    let mime = node.mimetype;
    let detectedMime = mime;
    let detectedExt = null;
    let detectedCategory = null;
    let bufferSize = 0;
    
    if (buffer && buffer.length) {
        bufferSize = buffer.length;
        try {
            const fileInfo = await fileType(buffer);
            if (fileInfo) {
                detectedMime = fileInfo.mime;
                detectedExt = fileInfo.ext;
                detectedCategory = await getCategory(fileInfo);
            }
        } catch {
            //
        }
    }
    
    let fileName = node.fileName || "N/A";
    if (type === 'document' && fileName === "N/A") {
        if (node.url) {
            try {
                const urlObj = new URL(node.url);
                const pathname = urlObj.pathname;
                const extracted = pathname.split('/').pop();
                if (extracted) fileName = extracted.split('?')[0];
            } catch {}
        }
    }
    
    const debugInfo = `📄 DEBUG INFO

📦 MEDIA DATA:
• Type: ${type}
• Original MIME: ${mime || "N/A"}
• Detected MIME: ${detectedMime || "N/A"}
${detectedExt ? `• Detected Extension: .${detectedExt}` : ''}
${detectedCategory ? `• Category: ${detectedCategory}` : ''}
${bufferSize > 0 ? `• Size: ${formatBytes(bufferSize)}` : ''}
• URL: ${node.url || "N/A"}
• Direct Path: ${node.directPath || "N/A"}
• File Name: ${fileName}
${q.text ? `• Has Text: Yes (${q.text.length} chars)` : ''}

${q.text ? `📝 TEXT PREVIEW:\n${q.text.substring(0, 200)}${q.text.length > 200 ? '...' : ''}\n\n` : ''}📋 FULL DATA:
${inspect(q)}
`.trim();
    
    if (sendMediaTypes.includes(type) && buffer && buffer.length) {
        const finalMime = detectedMime || mime;
        const finalExt = detectedExt || await getExtension(finalMime);
        
        if (type === 'image') {
            await conn.sendMessage(
                m.chat,
                {
                    image: buffer,
                    mimetype: finalMime,
                    caption: debugInfo
                }, { quoted: m }
            );
        } else if (type === 'video') {
            await conn.sendMessage(
                m.chat,
                {
                    video: buffer,
                    mimetype: finalMime,
                    caption: debugInfo
                }, { quoted: m }
            );
        } else if (type === 'document') {
            await conn.sendMessage(
                m.chat,
                {
                    document: buffer,
                    mimetype: finalMime,
                    fileName: fileName !== "N/A" ? fileName :
                        `document.${finalExt}`,
                    caption: debugInfo
                }, { quoted: m }
            );
        }
    } else {
        await conn.sendMessage(
            m.chat, { text: debugInfo }, { quoted: m }
        );
    }
};

function isByteArray(obj) {
    return (
        typeof obj === "object" &&
        obj !== null &&
        Object.keys(obj).every((k) => /^\d+$/.test(k)) &&
        Object.values(obj).every((v) => typeof v === "number" && v >= 0 &&
            v <= 255)
    );
}

function inspect(obj, depth = 0, seen = new WeakSet()) {
    if (obj === null) return "null";
    if (obj === undefined) return "undefined";
    if (typeof obj !== "object") return JSON.stringify(obj);
    if (seen.has(obj)) return "[Circular]";
    seen.add(obj);
    if (depth > 15) return "[Depth limit reached]";
    
    const result = {};
    for (const key of Reflect.ownKeys(obj)) {
        try {
            const desc = Object.getOwnPropertyDescriptor(obj, key);
            let value = desc?.get ? desc.get.call(obj) : obj[key];
            
            if (Buffer.isBuffer(value)) {
                const hex = BufferJSON.toJSON(value)
                    .data.map((v) => v.toString(16).padStart(2, "0"))
                    .join("");
                result[key] = `<Buffer ${hex}>`;
            } else if (isByteArray(value)) {
                const hex = Object.values(value)
                    .map((v) => v.toString(16).padStart(2, "0"))
                    .join("");
                result[key] = `<ByteArray ${hex}>`;
            } else if (typeof value === "function") {
                result[key] = `[Function ${value.name || "anonymous"}]`;
            } else if (typeof value === "object" && value !== null) {
                result[key] = inspect(value, depth + 1, seen);
            } else {
                result[key] = value;
            }
        } catch (e) {
            result[key] = `[Error: ${e.message}]`;
        }
    }
    
    return depth === 0 ? JSON.stringify(result, null, 2) : result;
}

handler.help = ["debug"];
handler.tags = ["tools"];
handler.command = /^(debug|q)$/i;
handler.owner = true;

export default handler;