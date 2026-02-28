/**
 * @file Multi-provider file uploader module
 * @module lib/uploader
 * @license Apache-2.0
 * @author Naruya Izumi
 */

import { fileTypeFromBuffer } from "file-type";

const HEADERS = {
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

async function uploader1(buf) {
    if (!buf || buf.length === 0) throw new Error("Empty buffer");

    const type = await fileTypeFromBuffer(buf);
    if (!type) throw new Error("Unknown file type");

    const form = new FormData();
    form.append("reqtype", "fileupload");
    const blob = new Blob([buf], { type: type.mime });
    form.append("fileToUpload", blob, `file.${type.ext}`);

    const res = await fetch("https://catbox.moe/user/api.php", {
        method: "POST",
        headers: HEADERS,
        body: form,
        signal: AbortSignal.timeout(60000),
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const txt = await res.text();
    if (!txt.startsWith("http")) throw new Error("Invalid response");

    return txt.trim();
}

async function uploader2(buf) {
    if (!buf || buf.length === 0) throw new Error("Empty buffer");

    const type = await fileTypeFromBuffer(buf);
    if (!type) throw new Error("Unknown file type");

    const form = new FormData();
    const blob = new Blob([buf], { type: type.mime });
    form.append("files[]", blob, `file.${type.ext}`);

    const res = await fetch("https://uguu.se/upload.php", {
        method: "POST",
        headers: HEADERS,
        body: form,
        signal: AbortSignal.timeout(60000),
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const json = await res.json();
    if (!json?.files?.[0]?.url) throw new Error("Invalid response");

    return json.files[0].url.trim();
}

async function uploader3(buf) {
    if (!buf || buf.length === 0) throw new Error("Empty buffer");

    const type = await fileTypeFromBuffer(buf);
    if (!type) throw new Error("Unknown file type");

    const form = new FormData();
    const blob = new Blob([buf], { type: type.mime });
    form.append("files[]", blob, `file.${type.ext}`);

    const res = await fetch("https://qu.ax/upload.php", {
        method: "POST",
        headers: HEADERS,
        body: form,
        signal: AbortSignal.timeout(60000),
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const json = await res.json();
    if (!json?.files?.[0]?.url) throw new Error("Invalid response");

    return json.files[0].url.trim();
}

async function uploader4(buf) {
    if (!buf || buf.length === 0) throw new Error("Empty buffer");

    const type = await fileTypeFromBuffer(buf);
    if (!type) throw new Error("Unknown file type");

    const res = await fetch("https://put.icu/upload/", {
        method: "PUT",
        headers: {
            ...HEADERS,
            "Content-Type": type.mime,
            Accept: "application/json",
        },
        body: buf,
        signal: AbortSignal.timeout(60000),
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const json = await res.json();
    if (!json?.direct_url) throw new Error("Invalid response");

    return json.direct_url.trim();
}

async function uploader5(buf) {
    if (!buf || buf.length === 0) throw new Error("Empty buffer");

    const type = await fileTypeFromBuffer(buf);
    if (!type) throw new Error("Unknown file type");

    const form = new FormData();
    const blob = new Blob([buf], { type: type.mime });
    form.append("file", blob, `file.${type.ext}`);

    const res = await fetch("https://tmpfiles.org/api/v1/upload", {
        method: "POST",
        headers: HEADERS,
        body: form,
        signal: AbortSignal.timeout(60000),
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const json = await res.json();
    if (!json?.data?.url) throw new Error("Invalid response");

    return json.data.url.replace("/file/", "/dl/").trim();
}

async function uploader6(buf) {
    if (!buf || buf.length === 0) throw new Error("Empty buffer");

    const type = await fileTypeFromBuffer(buf);
    if (!type) throw new Error("Unknown file type");

    if (!type.mime.startsWith("video/")) {
        throw new Error("Need video");
    }

    const form = new FormData();
    const blob = new Blob([buf], { type: type.mime });
    form.append("file", blob, `file.${type.ext}`);
    form.append("apikey", "freeApikey");

    const res = await fetch("https://anabot.my.id/api/tools/videy", {
        method: "POST",
        headers: { Accept: "*/*" },
        body: form,
        signal: AbortSignal.timeout(60000),
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const json = await res.json();
    if (!json?.success || !json?.data?.result?.link) {
        throw new Error("Invalid response");
    }

    return json.data.result.link.trim();
}

async function uploader7(buf) {
    if (!buf || buf.length === 0) throw new Error("Empty buffer");

    const type = await fileTypeFromBuffer(buf);
    if (!type) throw new Error("Unknown file type");

    if (!type.mime.startsWith("image/")) {
        throw new Error("Need image");
    }

    const form = new FormData();
    const blob = new Blob([buf], { type: type.mime });
    form.append("file", blob, `file.${type.ext}`);
    form.append("apikey", "freeApikey");

    const res = await fetch("https://anabot.my.id/api/tools/goFile", {
        method: "POST",
        headers: { Accept: "*/*" },
        body: form,
        signal: AbortSignal.timeout(60000),
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const json = await res.json();
    if (!json?.success || !json?.data?.result?.imageUrl) {
        throw new Error("Invalid response");
    }

    return json.data.result.imageUrl.trim();
}

async function uploader(buf) {
    const providers = [
        { name: "Catbox", fn: uploader1 },
        { name: "Uguu", fn: uploader2 },
        { name: "Qu.ax", fn: uploader3 },
        { name: "Put.icu", fn: uploader4 },
        { name: "Tmpfiles", fn: uploader5 },
    ];

    const attempts = [];

    for (const prov of providers) {
        try {
            const url = await prov.fn(buf);

            if (url && typeof url === "string" && url.startsWith("http")) {
                attempts.push({
                    provider: prov.name,
                    status: "success",
                    url,
                });

                return {
                    success: true,
                    url,
                    provider: prov.name,
                    attempts,
                };
            }

            attempts.push({
                provider: prov.name,
                status: "invalid",
            });
        } catch (e) {
            attempts.push({
                provider: prov.name,
                status: "error",
                error: e.message,
            });
            continue;
        }
    }

    return {
        success: false,
        url: null,
        provider: null,
        attempts,
    };
}

export { uploader1, uploader2, uploader3, uploader4, uploader5, uploader6, uploader7, uploader };