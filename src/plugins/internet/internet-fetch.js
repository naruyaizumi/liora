import {
    fileType,
    getExtension,
    formatBytes,
    getBrowserHeaders,
    isImage,
    isVideo,
    isAudio,
    isJson,
    isHtml,
} from "#lib/file-type.js";

let handler = async (m, { conn, text, usedPrefix, command }) => {
    const start = Date.now();

    if (!text || !/^https?:\/\//i.test(text.trim())) {
        return m.reply(`Need URL\nEx: ${usedPrefix + command} https://example.com`);
    }

    const url = text.trim();
    await global.loading(m, conn);

    const opts = {
        method: "GET",
        headers: getBrowserHeaders(),
        redirect: "follow",
        signal: AbortSignal.timeout(30000),
    };

    try {
        const res = await fetch(url, opts);
        const time = Date.now() - start;

        const final = res.url;
        const redirect = res.redirected || final !== url;

        if (!res.ok) {
            const err = await Bun.readableStreamToText(res.body).catch(() => "");
            const msg = `\`\`\`HTTP Error ${res.status}

URL: ${url}
${redirect ? `Final: ${final}\n` : ""}Status: ${res.status} ${res.statusText}
Time: ${time}ms
Type: ${res.headers.get("content-type") || "unknown"}
Length: ${res.headers.get("content-length") || "unknown"}

Preview:
${err.substring(0, 200)}${err.length > 200 ? "..." : ""}\`\`\``;
            return m.reply(msg);
        }

        const type = res.headers.get("content-type") || "application/octet-stream";
        const len = res.headers.get("content-length");
        const enc = res.headers.get("content-encoding");
        const server = res.headers.get("server");
        const date = res.headers.get("date");

        const processStart = Date.now();
        const u8 = await Bun.readableStreamToBytes(res.body);
        const buf = Buffer.from(u8);
        const processTime = Date.now() - processStart;
        const detect = await fileType(buf);

        let mime = type.split(";")[0].trim();
        let ext;
        if (detect) {
            mime = detect.mime;
            ext = detect.ext;
        } else {
            ext = (await getExtension(mime)) || "bin";
        }

        const json = isJson(mime);
        const img = isImage(mime);
        const vid = isVideo(mime);
        const aud = isAudio(mime);
        const html = isHtml(mime);

        const total = Date.now() - start;
        const rate = formatBytes(buf.length / (total / 1000)) + "/s";

        let info = "";
        if (json) {
            try {
                const j = JSON.parse(buf.toString("utf-8", 0, 50000));
                info = `JSON Type: ${Array.isArray(j) ? "Array" : typeof j}
JSON Keys: ${
                    Object.keys(j).length > 5
                        ? Object.keys(j).slice(0, 5).join(", ") + "..."
                        : Object.keys(j).join(", ")
                }
`;
            } catch {
                info = "JSON Type: Invalid\n";
            }
        } else if (html) {
            const t = buf.toString("utf-8", 0, 50000);
            const title = t.match(/<title[^>]*>([^<]+)<\/title>/i);
            info = `HTML Title: ${title ? title[1].substring(0, 50) : "Not found"}
`;
        }

        const cap = `FETCH

URL: ${url}
Final: ${final}
Redirect: ${redirect ? "Y" : "N"}

Status: ${res.status} ${res.statusText}
Server: ${server || "Unknown"}
Date: ${date || "N/A"}

Type: ${type}
Encoding: ${enc || "none"}
Length: ${len ? formatBytes(parseInt(len)) : formatBytes(buf.length)}
MIME: ${mime}
Ext: .${ext}
Detect: ${detect ? "Signature" : "Header"}

Type:
${img ? "✓ Image" : "✗ Image"}
${vid ? "✓ Video" : "✗ Video"} 
${aud ? "✓ Audio" : "✗ Audio"}
${json ? "✓ JSON" : "✗ JSON"}
${html ? "✓ HTML" : "✗ HTML"}

Time: ${total}ms
Network: ${time}ms
Process: ${processTime}ms
Rate: ${rate}

Size: ${formatBytes(buf.length)}
${info}`;

        let msg;
        if (img && buf.length > 1000) {
            msg = { image: buf, caption: cap };
        } else if (vid && buf.length > 10000) {
            msg = { video: buf, caption: cap };
        } else if (aud && buf.length > 1000) {
            msg = { audio: buf, mimetype: mime, caption: cap };
        } else {
            const name = `result.${ext}`;
            msg = {
                document: buf,
                mimetype: mime,
                fileName: name,
                caption: cap,
            };
        }

        await conn.sendMessage(m.chat, msg, { quoted: m });
    } catch (e) {
        const err = `\`\`\`FETCH ERROR

URL: ${url}
Error: ${e.name}
Message: ${e.message}
Time: ${Date.now() - start}ms\`\`\``;

        m.reply(err);
    } finally {
        await global.loading(m, conn, true);
    }
};

handler.help = ["fetch"];
handler.tags = ["internet"];
handler.command = /^(fetch|get)$/i;

export default handler;
