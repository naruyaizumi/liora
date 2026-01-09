import { formatBytes } from "#lib/file-type.js";

const findMedia = (obj) => {
    const seen = new WeakSet();

    const search = (o) => {
        if (!o || typeof o !== "object") return null;
        if (seen.has(o)) return null;
        seen.add(o);

        if (o.url || o.directPath) {
            let t = null;
            if (o.mimetype) {
                if (o.mimetype.startsWith("image/")) {
                    t = o.mimetype === "image/webp" ? "sticker" : "image";
                } else if (o.mimetype.startsWith("video/")) {
                    t = "video";
                } else if (o.mimetype.startsWith("audio/")) {
                    t = "audio";
                } else {
                    t = "document";
                }
            } else {
                if (o.width || o.height) t = "image";
                else if (o.seconds) t = "video";
                else if (o.ptt) t = "audio";
                else t = "document";
            }

            return { node: o, type: t };
        }

        const keys = [
            "message",
            "mediaMessage",
            "documentMessage",
            "imageMessage",
            "videoMessage",
            "audioMessage",
            "stickerMessage",
            "productImage",
        ];

        for (const k of keys) {
            if (o[k] && typeof o[k] === "object") {
                const r = search(o[k]);
                if (r) return r;
            }
        }

        for (const k of Object.keys(o)) {
            const v = o[k];
            if (v && typeof v === "object") {
                const r = search(v);
                if (r) return r;
            }
        }

        return null;
    };

    return search(obj);
};

const download = async (conn, node, type) => {
    try {
        const d = await conn.downloadM(node, type);
        return d instanceof Uint8Array ? d : new Uint8Array(0);
    } catch {
        return new Uint8Array(0);
    }
};

const send = async (conn, chatId, media, caption = "", opts = {}) => {
    const { type, data, node } = media;
    if (data.byteLength === 0) return false;

    try {
        const buf = Buffer.from(data.buffer, data.byteOffset, data.byteLength);

        const types = {
            image: { image: buf },
            video: { video: buf },
            audio: { audio: buf },
            sticker: { sticker: buf },
            document: { document: buf },
        };

        if (types[type]) {
            const p = {
                ...types[type],
                mimetype:
                    node.mimetype ||
                    (type === "sticker"
                        ? "image/webp"
                        : type === "audio"
                          ? "audio/mp4"
                          : type === "video"
                            ? "video/mp4"
                            : type === "image"
                              ? "image/jpeg"
                              : "application/octet-stream"),
                ...(type === "document" && { fileName: node.fileName || "doc.bin" }),
                ...(type === "audio" && { ptt: node.ptt || false }),
            };

            if (type !== "audio" && type !== "sticker" && caption) {
                p.caption = caption;
            }

            await conn.sendMessage(chatId, p, opts);
            return true;
        }
    } catch {
        return false;
    }

    return false;
};

let handler = async (m, { conn }) => {
    if (!m.quoted) throw new Error("No quoted");

    const q = m.quoted;
    const v = q.vM;

    const media = findMedia(q) || findMedia(v);
    let sent = false;

    const t = v?.message ? Object.keys(v.message)[0] : "unknown";

    const raw = Bun.inspect(v || q, {
        depth: null,
        colors: false,
        showHidden: true,
        getters: true,
        showProxy: true,
        maxArrayLength: null,
        breakLength: 80,
        compact: false,
    });

    const info = `📄 DEBUG

📦 Message:
Chat: ${q.chat || "N/A"}
From: ${q.sender || "N/A"}
Me: ${q.fromMe ? "Y" : "N"}
ID: ${q.id || "N/A"}
Type: ${t}

📦 Media:
Found: ${media ? "Y" : "N"}
Type: ${media?.type || "N/A"}
MIME: ${media?.node?.mimetype || "N/A"}
Size: ${media?.node?.fileLength ? formatBytes(Number(media.node.fileLength)) : "N/A"}

📦 Object:
\`\`\`
${raw}
\`\`\``;

    if (media) {
        const d = await download(conn, media.node, media.type);
        if (d.byteLength > 0) {
            sent = await send(
                conn,
                m.chat,
                {
                    node: media.node,
                    type: media.type,
                    data: d,
                },
                info,
                { quoted: m }
            );

            if (!sent || media.type === "audio" || media.type === "sticker") {
                await conn.sendMessage(m.chat, { text: info }, { quoted: m });
            }
        } else {
            await conn.sendMessage(m.chat, { text: info }, { quoted: m });
        }
    } else {
        await conn.sendMessage(m.chat, { text: info }, { quoted: m });
    }
};

handler.help = ["debug"];
handler.tags = ["tools"];
handler.command = /^(debug|q)$/i;
handler.owner = true;

export default handler;
