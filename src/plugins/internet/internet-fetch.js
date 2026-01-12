/**
 * @file URL fetcher and content analyzer command handler
 * @module plugins/internet/fetch
 * @license Apache-2.0
 * @author Naruya Izumi
 */

import { fileTypeFromBuffer } from "file-type";

/**
 * Converts bytes to human readable format
 * @function formatBytes
 * @param {number} bytes - Bytes to format
 * @returns {string} Formatted string
 */
function formatBytes(bytes) {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
}

/**
 * Returns browser-like HTTP headers
 * @function getHeaders
 * @returns {Object} HTTP headers
 */
function getHeaders() {
    return {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
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

/**
 * Converts ReadableStream to Uint8Array
 * @async
 * @function streamToBytes
 * @param {ReadableStream} stream - Readable stream
 * @returns {Promise<Uint8Array>} Byte array
 */
async function streamToBytes(stream) {
    const chunks = [];
    const reader = stream.getReader();

    try {
        while (true) {
            const { done, val } = await reader.read();
            if (done) break;
            chunks.push(val);
        }

        const total = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
        const comb = new Uint8Array(total);
        let off = 0;

        for (const chunk of chunks) {
            comb.set(chunk, off);
            off += chunk.length;
        }

        return comb;
    } finally {
        reader.releaseLock();
    }
}

/**
 * Fetches URL content and analyzes it
 * @async
 * @function handler
 * @param {Object} m - Message object
 * @param {Object} conn - Connection object
 * @param {string} text - URL to fetch
 * @param {string} usedPrefix - Command prefix used
 * @param {string} command - Command name
 * @returns {Promise<void>}
 *
 * @description
 * Downloads and analyzes content from URLs with detailed metadata.
 * Supports various content types with automatic detection.
 *
 * @features
 * - Downloads URL content with metadata analysis
 * - Automatic file type detection
 * - Supports images, videos, audio, JSON, HTML
 * - Returns formatted report with timing info
 * - Handles redirects and errors
 */

let handler = async (m, { conn, text, usedPrefix, command }) => {
    const start = Date.now();

    if (!text || !/^https?:\/\//i.test(text.trim())) {
        return m.reply(
            `Need URL\nEx: ${usedPrefix + command} https://example.com`
        );
    }

    const url = text.trim();
    await global.loading(m, conn);

    const opt = {
        method: "GET",
        headers: getHeaders(),
        redirect: "follow",
        signal: AbortSignal.timeout(30000),
    };

    try {
        const res = await fetch(url, opt);
        const fetchTime = Date.now() - start;

        const final = res.url;
        const redirect = res.redirected || final !== url;

        if (!res.ok) {
            const txt = await res.text().catch(() => "");
            const err = `HTTP ${res.status}\n\nURL: ${url}\n${redirect ? `Final: ${final}\n` : ""}Status: ${res.status} ${res.statusText}\nTime: ${fetchTime}ms\nType: ${res.headers.get("content-type") || "unknown"}\nSize: ${res.headers.get("content-length") || "unknown"}\n\nPreview:\n${txt.substring(0, 200)}${txt.length > 200 ? "..." : ""}`;
            return m.reply(err);
        }

        const type = res.headers.get("content-type") || "application/octet-stream";
        const size = res.headers.get("content-length");
        const enc = res.headers.get("content-encoding");
        const svr = res.headers.get("server");
        const dt = res.headers.get("date");

        const procStart = Date.now();
        const uint8 = await streamToBytes(res.body);
        const buf = Buffer.from(uint8);
        const procTime = Date.now() - procStart;

        let mime = type.split(";")[0].trim();
        let ext = mime.split("/")[1] || "bin";

        let detect;
        try {
            detect = await fileTypeFromBuffer(buf);
        } catch {
            /* ignore */
        }

        if (detect) {
            mime = detect.mime;
            ext = detect.ext;
        } else if (mime === "application/octet-stream" && buf.length > 100) {
            if (buf[0] === 0x89 && buf[1] === 0x50) {
                mime = "image/png";
                ext = "png";
            } else if (buf[0] === 0xff && buf[1] === 0xd8) {
                mime = "image/jpeg";
                ext = "jpg";
            } else if (buf[0] === 0x47 && buf[1] === 0x49) {
                mime = "image/gif";
                ext = "gif";
            } else if (
                buf.slice(0, 4).toString() === "<!DO" ||
                buf.slice(0, 5).toString() === "<html"
            ) {
                mime = "text/html";
                ext = "html";
            } else if (buf[0] === 0x7b || buf[0] === 0x5b) {
                mime = "application/json";
                ext = "json";
            }
        }

        const isJson = mime === "application/json" || mime.includes("json");
        const isImg = mime.startsWith("image/");
        const isVid = mime.startsWith("video/");
        const isAud = mime.startsWith("audio/");
        const isHtml = mime === "text/html";

        const total = Date.now() - start;
        const rate = formatBytes(buf.length / (total / 1000)) + "/s";

        let info = "";
        if (isJson) {
            const txt = buf.toString("utf-8", 0, 50000);
            try {
                const json = JSON.parse(txt);
                info = `JSON: ${Array.isArray(json) ? "Array" : typeof json}\n`;
                if (typeof json === "object" && json !== null) {
                    const keys = Object.keys(json);
                    info += `Keys: ${keys.length > 5 ? keys.slice(0, 5).join(", ") + "..." : keys.join(", ")}\n`;
                }
            } catch {
                /* ignore */
            }
        } else if (isHtml) {
            const txt = buf.toString("utf-8", 0, 50000);
            const title = txt.match(/<title[^>]*>([^<]+)<\/title>/i);
            info = `Title: ${title ? title[1].substring(0, 50) : "Not found"}\n`;
        }

        const cap = `FETCH REPORT

URL: ${url}
Final: ${final}
Redirect: ${redirect ? "Yes" : "No"}

Status: ${res.status} ${res.statusText}
Server: ${svr || "Unknown"}
Date: ${dt || "Not set"}

Type: ${type}
Encoding: ${enc || "none"}
Size: ${size ? formatBytes(parseInt(size)) : formatBytes(buf.length)}
Detect: ${mime}
Ext: .${ext}

Total: ${total}ms
Network: ${fetchTime}ms
Process: ${procTime}ms
Rate: ${rate}

Buffer: ${formatBytes(buf.length)}
${info}`;

        let msg;
        if (isImg && buf.length > 1000) {
            msg = { image: buf, caption: cap };
        } else if (isVid && buf.length > 10000) {
            msg = { video: buf, caption: cap };
        } else if (isAud && buf.length > 1000) {
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
        const err = `FETCH ERROR

URL: ${url}
Error: ${e.name}
Message: ${e.message}
Time: ${Date.now() - start}ms`;

        m.reply(err);
    } finally {
        await global.loading(m, conn, true);
    }
};

/**
 * Command metadata for help system
 * @property {Array<string>} help - Help text
 * @property {Array<string>} tags - Command categories
 * @property {RegExp} command - Command pattern matching
 */
handler.help = ["fetch"];
handler.tags = ["internet"];
handler.command = /^(fetch|get)$/i;

export default handler;