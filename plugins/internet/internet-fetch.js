import { fileTypeFromBuffer } from "file-type";

function parseFlags(text) {
    const parts = text.trim().split(/\s+/);
    const url = parts[0];
    const flags = {
        verbose: false,
        debug: false,
        headers: false,
        redirect: "follow",
        timeout: 30000,
        stream: false,
        method: "GET",
        body: null,
        contentType: null,
        sendHeaders: {},
    };

    for (let i = 1; i < parts.length; i++) {
        const flag = parts[i];
        const lowerFlag = flag.toLowerCase();

        if (lowerFlag === "--verbose" || lowerFlag === "-v") flags.verbose = true;
        if (lowerFlag === "--debug" || lowerFlag === "-d") flags.debug = true;
        if (lowerFlag === "--headers" || lowerFlag === "-h") flags.headers = true;
        if (lowerFlag === "--no-redirect") flags.redirect = "manual";
        if (lowerFlag === "--stream" || lowerFlag === "-s") flags.stream = true;

        if (lowerFlag.startsWith("--timeout=")) {
            flags.timeout = parseInt(flag.split("=")[1]) || 30000;
        }
        if (lowerFlag.startsWith("--method=")) {
            flags.method = flag.split("=")[1].toUpperCase();
        }
        if (lowerFlag.startsWith("--body=")) {
            flags.body = flag.substring(7);
        }
        if (lowerFlag.startsWith("--data=")) {
            flags.body = flag.substring(7);
        }
        if (lowerFlag.startsWith("--json=")) {
            flags.body = flag.substring(7);
            flags.contentType = "application/json";
        }
        if (lowerFlag.startsWith("--content-type=")) {
            flags.contentType = flag.split("=")[1];
        }
        if (lowerFlag.startsWith("--header=") || lowerFlag.startsWith("-h=")) {
            const headerPart = flag.substring(flag.indexOf("=") + 1);
            const [key, ...valueParts] = headerPart.split(":");
            if (key && valueParts.length > 0) {
                flags.sendHeaders[key.trim()] = valueParts.join(":").trim();
            }
        }
    }

    return { url, flags };
}

function formatBytes(bytes) {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
}

function formatHeaders(headers) {
    let result = "Response Headers:\n";
    headers.forEach((value, key) => {
        result += `  ${key}: ${value}\n`;
    });
    return result.trim();
}

function getBrowserHeaders() {
    return {
        "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        "Accept-Encoding": "gzip, deflate, br",
        "Cache-Control": "no-cache",
        Pragma: "no-cache",
        "Sec-Ch-Ua": '"Not_A Brand";v="8", "Chromium";v="120"',
        "Sec-Ch-Ua-Mobile": "?0",
        "Sec-Ch-Ua-Platform": '"Windows"',
        "Sec-Fetch-Dest": "document",
        "Sec-Fetch-Mode": "navigate",
        "Sec-Fetch-Site": "none",
        "Sec-Fetch-User": "?1",
        "Upgrade-Insecure-Requests": "1",
    };
}

let handler = async (m, { conn, text, usedPrefix, command }) => {
    const startTime = Date.now();
    let debugLog = [];

    try {
        if (!text || !/^https?:\/\//i.test(text.trim().split(/\s+/)[0])) {
            return m.reply(
                `\`\`\`Invalid URL format.\n\n` +
                    `Usage:\n` +
                    `${usedPrefix + command} <url> [flags]\n\n` +
                    `Available Flags:\n` +
                    `  --verbose, -v  : Verbose output\n` +
                    `  --debug, -d  : Debug mode\n` +
                    `  --headers, -h  : Show response headers\n` +
                    `  --no-redirect  : Don't follow redirects\n` +
                    `  --stream, -s  : Use stream mode\n` +
                    `  --timeout=<ms>  : Set timeout (default: 30000)\n` +
                    `  --method=<METHOD>  : HTTP method (GET, POST, PUT, DELETE, PATCH)\n` +
                    `  --body=<data>  : Request body (for POST/PUT/PATCH)\n` +
                    `  --data=<data>  : Alias for --body\n` +
                    `  --json=<data>  : JSON body (auto sets Content-Type)\n` +
                    `  --content-type=<type>  : Set Content-Type header\n` +
                    `  --header=<key:value>  : Add custom header\n\n` +
                    `Examples:\n` +
                    `${usedPrefix + command} https://example --verbose\n` +
                    `${usedPrefix + command} https://api.com/users --method=POST --json={"name":"izumi"}\n` +
                    `${usedPrefix + command} https://api.com/data --method=PUT --body=test --content-type=text/plain\n` +
                    `${usedPrefix + command} https://api.com --header=Authorization:api_token\`\`\``
            );
        }

        const { url, flags } = parseFlags(text);
        debugLog.push(`[INIT] URL: ${url}`);
        debugLog.push(`[INIT] Flags: ${JSON.stringify(flags, null, 2)}`);

        await global.loading(m, conn);

        const fetchOptions = {
            method: flags.method,
            headers: getBrowserHeaders(),
            redirect: flags.redirect,
            signal: AbortSignal.timeout(flags.timeout),
        };

        if (Object.keys(flags.sendHeaders).length > 0) {
            Object.assign(fetchOptions.headers, flags.sendHeaders);
            debugLog.push(`[HEADERS] Custom headers: ${JSON.stringify(flags.sendHeaders)}`);
        }

        if (flags.body && ["POST", "PUT", "PATCH", "DELETE"].includes(flags.method)) {
            if (
                flags.contentType === "application/json" ||
                flags.body.startsWith("{") ||
                flags.body.startsWith("[")
            ) {
                try {
                    const parsed = JSON.parse(flags.body);
                    fetchOptions.body = JSON.stringify(parsed);
                    fetchOptions.headers["Content-Type"] = "application/json";
                    debugLog.push(`[BODY] Type: JSON`);
                    debugLog.push(
                        `[BODY] Content: ${fetchOptions.body.substring(0, 200)}${fetchOptions.body.length > 200 ? "..." : ""}`
                    );
                } catch {
                    fetchOptions.body = flags.body;
                    fetchOptions.headers["Content-Type"] = flags.contentType || "text/plain";
                    debugLog.push(`[BODY] Type: ${fetchOptions.headers["Content-Type"]}`);
                    debugLog.push(
                        `[BODY] Content: ${flags.body.substring(0, 200)}${flags.body.length > 200 ? "..." : ""}`
                    );
                }
            } else {
                fetchOptions.body = flags.body;
                if (flags.contentType) {
                    fetchOptions.headers["Content-Type"] = flags.contentType;
                }
                debugLog.push(
                    `[BODY] Type: ${fetchOptions.headers["Content-Type"] || "text/plain"}`
                );
                debugLog.push(
                    `[BODY] Content: ${flags.body.substring(0, 200)}${flags.body.length > 200 ? "..." : ""}`
                );
            }
        }

        debugLog.push(`[FETCH] Starting request...`);
        debugLog.push(`[FETCH] Method: ${fetchOptions.method}`);
        debugLog.push(`[FETCH] Redirect: ${fetchOptions.redirect}`);
        debugLog.push(`[FETCH] Timeout: ${flags.timeout}ms`);

        const response = await fetch(url, fetchOptions);
        const fetchTime = Date.now() - startTime;

        debugLog.push(`[RESPONSE] Status: ${response.status} ${response.statusText}`);
        debugLog.push(`[RESPONSE] OK: ${response.ok}`);
        debugLog.push(`[RESPONSE] Time: ${fetchTime}ms`);
        debugLog.push(`[RESPONSE] Type: ${response.type}`);
        debugLog.push(`[RESPONSE] Redirected: ${response.redirected}`);

        if (response.redirected) {
            debugLog.push(`[RESPONSE] Final URL: ${response.url}`);
        }

        const contentType = response.headers.get("content-type") || "application/octet-stream";
        const contentLength = response.headers.get("content-length");

        debugLog.push(`[HEADERS] Content-Type: ${contentType}`);
        debugLog.push(`[HEADERS] Content-Length: ${contentLength || "unknown"}`);

        if (!response.ok) {
            const errorText = await response.text();
            debugLog.push(`[ERROR] Response Body: ${errorText.substring(0, 500)}`);

            let errorMsg = `\`\`\`HTTP Error ${response.status}\n\n`;
            errorMsg += `URL: ${url}\n`;
            errorMsg += `Status: ${response.status} ${response.statusText}\n`;
            errorMsg += `Time: ${fetchTime}ms\n`;

            if (flags.verbose || flags.debug) {
                errorMsg += `\nDebug Info:\n${debugLog.join("\n")}`;
            }

            errorMsg += `\`\`\``;

            return m.reply(errorMsg);
        }

        let buffer, processedData, detectedType, mime, ext;
        const processingStart = Date.now();

        debugLog.push(`[PROCESSING] Starting content processing...`);

        if (flags.stream) {
            const stream = response.body;
            debugLog.push(`[STREAM] Using ReadableStream processing`);

            const streamType = contentType.split(";")[0].trim().toLowerCase();

            try {
                if (streamType.includes("json")) {
                    debugLog.push(`[STREAM] Processing as JSON`);
                    processedData = await Bun.readableStreamToJSON(stream);
                    buffer = Buffer.from(JSON.stringify(processedData, null, 2));
                    mime = "application/json";
                    ext = "json";
                } else if (streamType.startsWith("text/")) {
                    debugLog.push(`[STREAM] Processing as Text`);
                    processedData = await Bun.readableStreamToText(stream);
                    buffer = Buffer.from(processedData);
                    mime = streamType;
                    ext = streamType.split("/")[1] || "txt";
                } else if (streamType.includes("form")) {
                    debugLog.push(`[STREAM] Processing as FormData`);
                    const boundary = contentType.match(/boundary=([^;]+)/)?.[1];
                    processedData = await Bun.readableStreamToFormData(stream, boundary);
                    buffer = Buffer.from(
                        JSON.stringify(Object.fromEntries(processedData), null, 2)
                    );
                    mime = "application/json";
                    ext = "json";
                } else {
                    debugLog.push(`[STREAM] Processing as Binary (Bytes)`);
                    const uint8Array = await Bun.readableStreamToBytes(stream);
                    buffer = Buffer.from(uint8Array);
                    mime = streamType;
                    ext = "bin";
                }
            } catch (streamError) {
                debugLog.push(`[STREAM] Error: ${streamError.message}`);
                debugLog.push(`[STREAM] Fallback to ArrayBuffer`);
                const arrayBuffer = await Bun.readableStreamToArrayBuffer(response.body);
                buffer = Buffer.from(arrayBuffer);
                mime = contentType;
                ext = "bin";
            }
        } else {
            debugLog.push(`[BUFFER] Using standard buffer processing`);
            const arrayBuffer = await response.arrayBuffer();
            buffer = Buffer.from(arrayBuffer);
        }

        const processingTime = Date.now() - processingStart;
        debugLog.push(`[PROCESSING] Completed in ${processingTime}ms`);
        debugLog.push(`[BUFFER] Size: ${formatBytes(buffer.length)}`);

        if (!mime || mime === "application/octet-stream") {
            debugLog.push(`[DETECT] Detecting file type...`);
            try {
                detectedType = await fileTypeFromBuffer(buffer);
                if (detectedType) {
                    mime = detectedType.mime;
                    ext = detectedType.ext;
                    debugLog.push(`[DETECT] Type: ${mime} (.${ext})`);
                } else {
                    mime = contentType.split(";")[0].trim();
                    ext = mime.split("/")[1] || "bin";
                    debugLog.push(`[DETECT] Using Content-Type header`);
                }
            } catch (detectError) {
                debugLog.push(`[DETECT] Error: ${detectError.message}`);
                mime = contentType.split(";")[0].trim();
                ext = mime.split("/")[1] || "bin";
            }
        }

        const isJson = mime === "application/json" || mime.includes("json");
        const isText =
            mime.startsWith("text/") || mime.includes("xml") || mime.includes("javascript");
        const isImage = mime.startsWith("image/");
        const isVideo = mime.startsWith("video/");
        const isAudio = mime.startsWith("audio/");

        debugLog.push(
            `[CATEGORY] JSON: ${isJson}, Text: ${isText}, Image: ${isImage}, Video: ${isVideo}, Audio: ${isAudio}`
        );

        const totalTime = Date.now() - startTime;
        let caption = `\`\`\`Fetch Success\n\n`;
        caption += `URL: ${url}\n`;
        caption += `Method: ${flags.method}\n`;
        caption += `Status: ${response.status} ${response.statusText}\n`;
        caption += `Size: ${formatBytes(buffer.length)}\n`;
        caption += `MIME: ${mime}\n`;
        caption += `Extension: .${ext}\n`;
        caption += `Time: ${totalTime}ms (Fetch: ${fetchTime}ms, Process: ${processingTime}ms)\n`;

        if (flags.body) {
            caption += `Request Body: ${flags.body.substring(0, 100)}${flags.body.length > 100 ? "..." : ""}\n`;
        }

        if (response.redirected) {
            caption += `Redirected: Yes\n`;
            caption += `Final URL: ${response.url}\n`;
        }

        if (flags.headers) {
            caption += `\n${formatHeaders(response.headers)}\n`;
        }

        if (flags.debug) {
            caption += `\nDebug Log:\n${debugLog.join("\n")}\n`;
        }

        let msg;
        const fileName = `result.${ext}`;

        if (isJson || isText) {
            let preview = buffer.toString("utf-8");

            if (isJson) {
                try {
                    const parsed = JSON.parse(preview);
                    preview = JSON.stringify(parsed, null, 2);
                    debugLog.push(`[JSON] Formatted successfully`);
                } catch (e) {
                    debugLog.push(`[JSON] Parse error: ${e.message}`);
                }
            }

            const previewLimit = 5000;
            if (preview.length > previewLimit) {
                caption += `\nPreview (first ${previewLimit} chars):\n${preview.substring(0, previewLimit)}...\n`;
            } else {
                caption += `\nContent:\n${preview}\n`;
            }

            caption += `\`\`\``;

            msg = {
                document: buffer,
                mimetype: mime,
                fileName: fileName,
                caption: caption,
            };
        } else if (isImage) {
            caption += `\`\`\``;
            msg = { image: buffer, caption: caption };
        } else if (isVideo) {
            caption += `\`\`\``;
            msg = { video: buffer, caption: caption };
        } else if (isAudio) {
            caption += `\`\`\``;
            msg = { audio: buffer, mimetype: mime, caption: caption };
        } else {
            caption += `\`\`\``;
            msg = {
                document: buffer,
                mimetype: mime,
                fileName: fileName,
                caption: caption,
            };
        }

        try {
            await conn.sendMessage(m.chat, msg, { quoted: m });
            debugLog.push(`[SEND] Message sent successfully`);
        } catch (sendError) {
            debugLog.push(`[SEND] Error: ${sendError.message}`);
            debugLog.push(`[SEND] Attempting text fallback...`);

            await conn.sendMessage(
                m.chat,
                {
                    text: `\`\`\`${caption}\n\nCould not send media. Error: ${sendError.message}\`\`\``,
                },
                { quoted: m }
            );
        }

        if (flags.verbose) {
            const verboseMsg = `\`\`\`Verbose Output:\n\n${debugLog.join("\n")}\`\`\``;
            await conn.sendMessage(m.chat, { text: verboseMsg }, { quoted: m });
        }
    } catch (e) {
        debugLog.push(`[ERROR] ${e.name}: ${e.message}`);
        debugLog.push(`[ERROR] Stack: ${e.stack}`);

        conn.logger?.error(e);

        let errorMsg = `\`\`\`Error occurred\n\n`;
        errorMsg += `Type: ${e.name}\n`;
        errorMsg += `Message: ${e.message}\n`;
        errorMsg += `Time: ${Date.now() - startTime}ms\n\n`;

        if (e.name === "TimeoutError") {
            errorMsg += `Request timeout. Try increasing timeout with --timeout=<ms>\n`;
        } else if (e.name === "TypeError" && e.message.includes("fetch")) {
            errorMsg += `Network error. Check URL and connection.\n`;
        }

        errorMsg += `\nDebug Info:\n${debugLog.join("\n")}\`\`\``;

        m.reply(errorMsg);
    } finally {
        await global.loading(m, conn, true);
    }
};

handler.help = ["fetch"];
handler.tags = ["internet"];
handler.command = /^(fetch|get)$/i;
handler.owner = true;

export default handler;
