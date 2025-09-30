import fs from "fs/promises";
import { existsSync } from "fs";
import { join, basename, extname } from "path";
import { fileTypeFromBuffer } from "file-type";
import http from "http";
import https from "https";

const MAX_BYTES = 25 * 1024 * 1024;

async function smartFetch(url, opts = {}) {
    try {
        const res = await fetch(url, {
            ...opts,
            agent: opts.agent || new https.Agent({ rejectUnauthorized: true }),
        }).catch(() => null);

        if (res) {
            const buf = Buffer.from(await res.arrayBuffer().catch(() => new ArrayBuffer(0)));
            return { buffer: buf, res, fallback: false };
        }
    } catch (e) {
        console.warn("⚠️ Fetch error:", e.message);
    }

    return new Promise((resolve) => {
        try {
            const lib = url.startsWith("https") ? https : http;
            const req = lib.get(
                url,
                {
                    rejectUnauthorized: false,
                    headers: opts.headers || {},
                    timeout: opts.timeout || 15000,
                },
                (res) => {
                    let data = [];
                    res.on("data", (c) => data.push(c));
                    res.on("end", () => {
                        const buffer = Buffer.concat(data);

                        const headersObj = {};
                        for (const [k, v] of Object.entries(res.headers || {})) {
                            headersObj[k.toLowerCase()] = v;
                        }
                        res.headers = {
                            get: (k) => headersObj[k.toLowerCase()] || null,
                            raw: () => headersObj,
                        };
                        res.status = res.statusCode || 0;
                        res.statusText = res.statusMessage || "";

                        resolve({ buffer, res, fallback: true });
                    });
                }
            );
            req.on("error", () => {
                resolve({
                    buffer: Buffer.alloc(0),
                    res: {
                        status: 0,
                        statusText: "ERROR",
                        headers: { get: () => null, raw: () => ({}) },
                    },
                    fallback: true,
                });
            });
            req.on("timeout", () => {
                req.destroy();
                resolve({
                    buffer: Buffer.alloc(0),
                    res: {
                        status: 0,
                        statusText: "TIMEOUT",
                        headers: { get: () => null, raw: () => ({}) },
                    },
                    fallback: true,
                });
            });
        } catch {
            resolve({
                buffer: Buffer.alloc(0),
                res: {
                    status: 0,
                    statusText: "INVALID_URL",
                    headers: { get: () => null, raw: () => ({}) },
                },
                fallback: true,
            });
        }
    });
}

function decodeRFC5987(v = "") {
    try {
        if (!v) return "";
        const m = v.match(/^([^']*)'([^']*)'(.*)$/);
        if (!m) return v;
        const charset = m[1] || "utf-8";
        const value = m[3];
        if (/utf-?8/i.test(charset)) {
            return decodeURIComponent(value);
        }
        return value;
    } catch {
        return v;
    }
}

function parseContentDisposition(cd = "") {
    if (!cd) return {};
    const out = {};
    const star = cd.match(/filename\*\s*=\s*([^;]+)/i);
    if (star) {
        out.filenameStar = decodeRFC5987(star[1].trim().replace(/^"(.*)"$/, "$1"));
    }

    const plain = cd.match(/filename\s*=\s*([^;]+)/i);
    if (plain) {
        let name = plain[1].trim().replace(/^"(.*)"$/, "$1");
        name = name.replace(/\\(.)/g, "$1");
        out.filename = name;
    }

    return out;
}

function pickExtFromCT(ct = "") {
    if (!ct) return "";
    const core = ct.split(";")[0].trim().toLowerCase();
    const map = {
        "image/jpeg": "jpg",
        "image/jpg": "jpg",
        "image/png": "png",
        "image/webp": "webp",
        "image/gif": "gif",
        "image/svg+xml": "svg",
        "image/bmp": "bmp",
        "image/tiff": "tif",
        "video/mp4": "mp4",
        "video/webm": "webm",
        "video/3gpp": "3gp",
        "video/x-msvideo": "avi",
        "video/x-matroska": "mkv",
        "audio/mpeg": "mp3",
        "audio/wav": "wav",
        "audio/aac": "aac",
        "audio/flac": "flac",
        "audio/x-m4a": "m4a",
        "audio/webm": "webm",
        "audio/ogg": "ogg",
        "audio/opus": "opus",
        "application/pdf": "pdf",
        "text/plain": "txt",
        "text/html": "html",
        "application/json": "json",
        "application/xml": "xml",
        "text/xml": "xml",
        "text/css": "css",
        "application/javascript": "js",
        "text/javascript": "js",
        "application/zip": "zip",
        "application/x-rar-compressed": "rar",
        "application/x-7z-compressed": "7z",
        "application/gzip": "gz",
        "application/x-tar": "tar",
        "application/msword": "doc",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
        "application/vnd.ms-excel": "xls",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
        "application/vnd.ms-powerpoint": "ppt",
        "application/vnd.openxmlformats-officedocument.presentationml.presentation": "pptx",
    };
    return map[core] || core.split("/")[1] || "";
}

function sanitizeBase(name = "") {
    if (!name) return `file_${Date.now()}`;
    let safe = name.replace(/[/\\?%*:|"<>]/g, "_");
    safe = safe.normalize("NFKD").replace(/[^\w.\- ]/g, "_");
    safe = safe.replace(/\s+/g, " ").trim();
    if (safe.length > 200) safe = safe.slice(0, 200);
    return safe || `file_${Date.now()}`;
}

function ensureExt(base = "", ext = "") {
    if (!ext) return base || `file_${Date.now()}.bin`;
    let got = extname(base).slice(1).toLowerCase();
    if (got === "") {
        return `${base}${ext.startsWith(".") ? "" : "."}${ext.toLowerCase()}`;
    }
    if (got) return base;
    return `${base}${ext.startsWith(".") ? "" : "."}${ext.toLowerCase()}`;
}

function short(s = "", n = 120, suffix = "...") {
    if (!s) return "";
    if (s.length <= n) return s;
    let truncated = [...s].slice(0, n - suffix.length).join("");
    return truncated + suffix;
}

function statusExplain(code = 0) {
    const categories = {
        1: "Informational",
        2: "Success",
        3: "Redirection",
        4: "Client Error",
        5: "Server Error",
    };

    const map = {
        100: "Continue — Request awal diterima, lanjutkan",
        101: "Switching Protocols — Server ganti protokol",
        102: "Processing — Server sedang proses (WebDAV)",
        103: "Early Hints — Header awal (preload)",
        200: "OK — Request sukses",
        201: "Created — Resource berhasil dibuat",
        202: "Accepted — Request diterima, masih diproses",
        203: "Non-Authoritative Info — Data mungkin tidak dari server asli",
        204: "No Content — Tidak ada konten",
        205: "Reset Content — Reset tampilan form",
        206: "Partial Content — Sebagian data dikirim (Range request)",
        207: "Multi-Status — Banyak status (WebDAV)",
        208: "Already Reported — Sudah dilaporkan (WebDAV)",
        226: "IM Used — Instance Manipulation",
        300: "Multiple Choices — Banyak opsi resource",
        301: "Moved Permanently — Redirect permanen",
        302: "Found — Redirect sementara",
        303: "See Other — Redirect ke resource lain",
        304: "Not Modified — Resource belum berubah (cache)",
        305: "Use Proxy — Harus lewat proxy",
        306: "Switch Proxy — Deprecated",
        307: "Temporary Redirect — Redirect sementara",
        308: "Permanent Redirect — Redirect permanen",
        400: "Bad Request — Request tidak valid",
        401: "Unauthorized — Butuh autentikasi",
        402: "Payment Required — Reserved",
        403: "Forbidden — Tidak punya izin",
        404: "Not Found — Resource tidak ada",
        405: "Method Not Allowed — Method tidak didukung",
        406: "Not Acceptable — Format tidak diterima",
        407: "Proxy Auth Required — Autentikasi proxy",
        408: "Request Timeout — Timeout request",
        409: "Conflict — Terjadi konflik",
        410: "Gone — Resource sudah dihapus",
        411: "Length Required — Wajib ada Content-Length",
        412: "Precondition Failed — Kondisi gagal",
        413: "Payload Too Large — Body terlalu besar",
        414: "URI Too Long — URL terlalu panjang",
        415: "Unsupported Media Type — Tipe media tidak didukung",
        416: "Range Not Satisfiable — Range request tidak valid",
        417: "Expectation Failed — Header Expect gagal",
        418: "I'm a teapot ☕ — RFC 2324 (April Fools)",
        421: "Misdirected Request — Server salah tujuan",
        422: "Unprocessable Entity — Tidak bisa diproses (WebDAV)",
        423: "Locked — Resource terkunci (WebDAV)",
        424: "Failed Dependency — Dependency gagal (WebDAV)",
        425: "Too Early — Request terlalu dini",
        426: "Upgrade Required — Harus upgrade protokol",
        428: "Precondition Required — Precondition wajib",
        429: "Too Many Requests — Rate limit",
        431: "Request Header Fields Too Large — Header terlalu besar",
        451: "Unavailable For Legal Reasons — Diblokir hukum",
        500: "Internal Server Error — Kesalahan server",
        501: "Not Implemented — Belum didukung",
        502: "Bad Gateway — Gateway error",
        503: "Service Unavailable — Server down",
        504: "Gateway Timeout — Timeout gateway",
        505: "HTTP Version Not Supported — Versi HTTP tidak didukung",
        506: "Variant Also Negotiates — Konfigurasi salah",
        507: "Insufficient Storage — Penyimpanan kurang (WebDAV)",
        508: "Loop Detected — Loop tak berujung (WebDAV)",
        510: "Not Extended — Ekstensi dibutuhkan",
        511: "Network Authentication Required — Autentikasi jaringan wajib",
    };
    const desc = map[code] || "Unknown Status";
    const cat = categories[Math.floor(code / 100)] || "Unknown";
    return `${desc} [${cat}]`;
}

function formatSize(bytes = 0) {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + " KB";
    return (bytes / (1024 * 1024)).toFixed(2) + " MB";
}

let handler = async (m, { text, conn, usedPrefix, command }) => {
    if (!/^https?:\/\//i.test(text || "")) {
        return m.reply(
            `🍓 *Awali URL dengan http:// atau https://*\n*Contoh: ${usedPrefix + command} https://example.com/file.jpg*`
        );
    }

    await global.loading(m, conn);

    let current = text;
    let redirects = 0;
    let finalURL = text;
    let contentType = "application/octet-stream";
    let contentLength = 0;
    let filename = "";
    let buffer = Buffer.alloc(0);
    let lastStatus = 0;
    let usedFallback = false;

    while (redirects < 10) {
        const {
            buffer: buf,
            res,
            fallback,
        } = await smartFetch(current, {
            redirect: "manual",
            headers: {
                "User-Agent": "Mozilla/5.0 (NodeBot)",
                Accept: "*/*",
            },
        }).catch((e) => ({
            buffer: Buffer.from(`Fetch error: ${e.message}`, "utf-8"),
            res: { status: 0, statusText: "FetchError", headers: { get: () => null } },
            fallback: true,
        }));

        lastStatus = res.status;
        usedFallback = fallback;
        finalURL = current;
        contentType = res.headers.get("content-type") || contentType;
        contentLength = parseInt(res.headers.get("content-length") || "0", 10);

        const cd = res.headers.get("content-disposition") || "";
        const { filename: cdName, filenameStar } = parseContentDisposition(cd);

        const urlObj = new URL(current, finalURL);
        const urlBase = sanitizeBase(basename(urlObj.pathname)) || `file_${Date.now()}`;
        filename = filenameStar || cdName || urlBase;

        if ([301, 302, 303, 307, 308].includes(lastStatus)) {
            const loc = res.headers.get("location");
            if (!loc) {
                buffer = Buffer.from(`Redirect tanpa Location (status ${lastStatus})`, "utf-8");
                filename = "error.txt";
                break;
            }
            current = new URL(loc, current).toString();
            redirects++;
            continue;
        }

        if (lastStatus < 200 || lastStatus >= 300) {
            if (buf?.length) {
                buffer = buf;
                filename = filename || `response_${lastStatus}.txt`;
            } else {
                buffer = Buffer.from(`Status HTTP ${lastStatus} ${res.statusText || ""}`, "utf-8");
                filename = "error.txt";
            }
            break;
        }

        if (!buf?.length) {
            buffer = Buffer.from("Konten kosong", "utf-8");
            filename = "error.txt";
        } else if (buf.length > MAX_BYTES) {
            buffer = buf.slice(0, MAX_BYTES);
            filename = "truncated.bin";
        } else {
            buffer = buf;
        }
        break;
    }

    if (redirects >= 10) {
        buffer = Buffer.from("Terlalu banyak redirect (> 10)", "utf-8");
        filename = "error.txt";
    }

    let ft = await fileTypeFromBuffer(buffer);
    const headerExt = pickExtFromCT(contentType);
    if (!ft) {
        const gotExt = extname(filename).slice(1).toLowerCase();
        const useExt = gotExt || headerExt || "bin";
        ft = { ext: useExt, mime: contentType || "application/octet-stream" };
    } else if (!extname(filename)) {
        filename = ensureExt(filename, ft.ext || headerExt || "bin");
    }

    filename = ensureExt(sanitizeBase(filename), ft.ext || headerExt || "bin");

    const tmpDir = "./tmp";
    await fs.mkdir(tmpDir, { recursive: true });
    const filePath = join(tmpDir, filename);
    await fs.writeFile(filePath, buffer);

    const mime = (ft.mime || contentType || "application/octet-stream").toLowerCase();
    const baseCaption = `🍰 *FETCH DEBUG INFO*
━━━━━━━━━━━━━━━━━━━
🍓 *Final URL: ${short(finalURL)}*
🍬 *Status: ${lastStatus} ${statusExplain(lastStatus)}*
🍧 *Redirects: ${redirects}*
🍡 *Used Fallback: ${usedFallback ? "Yes (http/https)" : "No (fetch)"}*
🍩 *Content-Type (header): ${contentType}*
🍮 *MIME (detected): ${mime}*
🍪 *Extension: ${ft.ext || headerExt || "-"}*
🍭 *Filename: ${filename}*
🍦 *Size: ${contentLength ? formatSize(contentLength) : formatSize(buffer.length)}*`;

    let msg;
    if (mime.startsWith("image/")) {
        msg = { image: buffer, caption: baseCaption };
    } else if (mime.startsWith("video/")) {
        msg = { video: buffer, caption: baseCaption };
    } else if (mime.startsWith("audio/")) {
        msg = { audio: buffer, mimetype: mime, ptt: ft.ext === "ogg" };
    } else {
        if (buffer.length < 100 * 1024) {
            let textPreview = buffer.toString("utf-8");
            if (textPreview.length > 4000)
                textPreview = textPreview.slice(0, 4000) + "\n... (truncated)";
            msg = { text: baseCaption + "\n\n📄 *Content Preview:*\n```" + textPreview + "```" };
        } else {
            msg = { document: buffer, mimetype: mime, fileName: filename, caption: baseCaption };
        }
    }

    let sentOk = false;
    try {
        await conn.sendMessage(m.chat, msg, { quoted: m });
        sentOk = true;
    } catch {
        if (msg.image) msg.image = { url: filePath };
        else if (msg.video) msg.video = { url: filePath };
        else if (msg.audio) msg.audio = { url: filePath };
        else if (msg.document) msg.document = { url: filePath };
        await conn.sendMessage(m.chat, msg, { quoted: m }).catch(async () => {
            await conn.sendMessage(
                m.chat,
                {
                    document: buffer,
                    mimetype: "text/plain",
                    fileName: "fallback.txt",
                    caption: baseCaption,
                },
                { quoted: m }
            );
        });
    } finally {
        if (existsSync(filePath)) {
            await fs.unlink(filePath).catch(() => {});
        }
        await global.loading(m, conn, true);
    }
};

handler.help = ["fetch"];
handler.tags = ["internet"];
handler.command = /^(fetch|get)$/i;
handler.owner = true;

export default handler;
