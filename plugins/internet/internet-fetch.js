import { fileTypeFromBuffer } from "file-type";

function formatBytes(bytes) {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
}

function getBrowserHeaders() {
    return {
        "User-Agent":
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
        "Accept-Language": "en-US,en;q=0.9",
        "Accept-Encoding": "gzip, deflate, br",
        "Cache-Control": "no-cache",
        Pragma: "no-cache",
        "Sec-Ch-Ua": '"Not_A Brand";v="8", "Chromium";v="120"',
        "Sec-Ch-Ua-Mobile": "?0",
        "Sec-Ch-Ua-Platform": '"macOS"',
        "Sec-Fetch-Dest": "document",
        "Sec-Fetch-Mode": "navigate",
        "Sec-Fetch-Site": "none",
        "Sec-Fetch-User": "?1",
        "Upgrade-Insecure-Requests": "1",
    };
}

async function readableStreamToBytes(stream) {
    const chunks = [];
    const reader = stream.getReader();

    try {
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            chunks.push(value);
        }

        const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
        const combined = new Uint8Array(totalLength);
        let offset = 0;

        for (const chunk of chunks) {
            combined.set(chunk, offset);
            offset += chunk.length;
        }

        return combined;
    } finally {
        reader.releaseLock();
    }
}

let handler = async (m, { conn, text, usedPrefix, command }) => {
    const startTime = Date.now();

    if (!text || !/^https?:\/\//i.test(text.trim())) {
        return m.reply(
            `\`\`\`Usage: ${usedPrefix + command} <url>\n\nExample: ${usedPrefix + command} https://example.com\`\`\``
        );
    }

    const originalUrl = text.trim();
    await global.loading(m, conn);

    const fetchOptions = {
        method: "GET",
        headers: getBrowserHeaders(),
        redirect: "follow",
        signal: AbortSignal.timeout(30000),
    };

    try {
        const response = await fetch(originalUrl, fetchOptions);
        const fetchTime = Date.now() - startTime;

        const finalUrl = response.url;
        const wasRedirected = response.redirected || finalUrl !== originalUrl;

        if (!response.ok) {
            const errorText = await response.text().catch(() => "");
            const errorMsg = `\`\`\`HTTP Error ${response.status}\n\nRequest URL: ${originalUrl}\n${wasRedirected ? `Final URL: ${finalUrl}\n` : ""}Status: ${response.status} ${response.statusText}\nTime: ${fetchTime}ms\nContent-Type: ${response.headers.get("content-type") || "unknown"}\nContent-Length: ${response.headers.get("content-length") || "unknown"}\n\nResponse Preview:\n${errorText.substring(0, 200)}${errorText.length > 200 ? "..." : ""}\`\`\``;
            return m.reply(errorMsg);
        }

        const contentType = response.headers.get("content-type") || "application/octet-stream";
        const contentLength = response.headers.get("content-length");
        const contentEncoding = response.headers.get("content-encoding");
        const server = response.headers.get("server");
        const date = response.headers.get("date");

        const processingStart = Date.now();
        const uint8Array = await readableStreamToBytes(response.body);
        const buffer = Buffer.from(uint8Array);
        const processingTime = Date.now() - processingStart;

        let mime = contentType.split(";")[0].trim();
        let ext = mime.split("/")[1] || "bin";

        let detectedType;
        try {
            detectedType = await fileTypeFromBuffer(buffer);
        } catch {
            /* ignore */
        }

        if (detectedType) {
            mime = detectedType.mime;
            ext = detectedType.ext;
        } else if (mime === "application/octet-stream" && buffer.length > 100) {
            if (buffer[0] === 0x89 && buffer[1] === 0x50) {
                mime = "image/png";
                ext = "png";
            } else if (buffer[0] === 0xff && buffer[1] === 0xd8) {
                mime = "image/jpeg";
                ext = "jpg";
            } else if (buffer[0] === 0x47 && buffer[1] === 0x49) {
                mime = "image/gif";
                ext = "gif";
            } else if (
                buffer.slice(0, 4).toString() === "<!DO" ||
                buffer.slice(0, 5).toString() === "<html"
            ) {
                mime = "text/html";
                ext = "html";
            } else if (buffer[0] === 0x7b || buffer[0] === 0x5b) {
                mime = "application/json";
                ext = "json";
            }
        }

        const isJson = mime === "application/json" || mime.includes("json");
        const isImage = mime.startsWith("image/");
        const isVideo = mime.startsWith("video/");
        const isAudio = mime.startsWith("audio/");
        const isHtml = mime === "text/html";

        const totalTime = Date.now() - startTime;
        const transferRate = formatBytes(buffer.length / (totalTime / 1000)) + "/s";

        let contentTypeInfo = "";
        if (isJson) {
            const textContent = buffer.toString("utf-8", 0, 50000);
            try {
                const jsonContent = JSON.parse(textContent);
                contentTypeInfo = `JSON Type: ${Array.isArray(jsonContent) ? "Array" : typeof jsonContent}\n`;
                if (typeof jsonContent === "object" && jsonContent !== null) {
                    const keys = Object.keys(jsonContent);
                    contentTypeInfo += `JSON Keys: ${keys.length > 5 ? keys.slice(0, 5).join(", ") + "..." : keys.join(", ")}\n`;
                }
            } catch {
                /* ignore */
            }
        } else if (isHtml) {
            const textContent = buffer.toString("utf-8", 0, 50000);
            const titleMatch = textContent.match(/<title[^>]*>([^<]+)<\/title>/i);
            contentTypeInfo = `HTML Title: ${titleMatch ? titleMatch[1].substring(0, 50) : "Not found"}\n`;
        }

        const caption = `FETCH REPORT

URL: ${originalUrl}
Final URL: ${finalUrl}
Redirected: ${wasRedirected ? "Yes" : "No"}

Status: ${response.status} ${response.statusText}
Server: ${server || "Unknown"}
Date: ${date || "Not specified"}

Content-Type: ${contentType}
Content-Encoding: ${contentEncoding || "none"}
Content-Length: ${contentLength ? formatBytes(parseInt(contentLength)) : formatBytes(buffer.length)}
Detected MIME: ${mime}
File Extension: .${ext}

Total Time: ${totalTime}ms
Network Time: ${fetchTime}ms
Processing Time: ${processingTime}ms
Transfer Rate: ${transferRate}

Buffer Size: ${formatBytes(buffer.length)}
${contentTypeInfo}`;

        let msg;
        if (isImage && buffer.length > 1000) {
            msg = { image: buffer, caption: caption };
        } else if (isVideo && buffer.length > 10000) {
            msg = { video: buffer, caption: caption };
        } else if (isAudio && buffer.length > 1000) {
            msg = { audio: buffer, mimetype: mime, caption: caption };
        } else {
            const fileName = `result.${ext}`;
            msg = {
                document: buffer,
                mimetype: mime,
                fileName: fileName,
                caption: caption,
            };
        }

        await conn.sendMessage(m.chat, msg, { quoted: m });
    } catch (e) {
        const errorMsg = `\`\`\`FETCH ERROR

Request URL: ${originalUrl}
Error Type: ${e.name}
Error Message: ${e.message}
Time Elapsed: ${Date.now() - startTime}ms\`\`\``;

        m.reply(errorMsg);
    } finally {
        await global.loading(m, conn, true);
    }
};

handler.help = ["fetch"];
handler.tags = ["internet"];
handler.command = /^(fetch|get)$/i;

export default handler;
