/* global conn */
import { fileTypeFromBuffer } from "file-type";

const DEFAULT_HEADERS = {
    "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    Accept: "*/*",
    "Accept-Language": "en-US,en;q=0.9",
    "Accept-Encoding": "gzip, deflate, br",
    "Cache-Control": "no-cache",
    Pragma: "no-cache",
};

async function uploader1(buffer) {
    try {
        if (!buffer || buffer.length === 0) throw new Error("Buffer cannot be empty");

        const type = await fileTypeFromBuffer(buffer);
        if (!type) throw new Error("Unrecognized file format");

        const formData = new FormData();
        formData.append("reqtype", "fileupload");
        const blob = new Blob([buffer], { type: type.mime });
        formData.append("fileToUpload", blob, `upload.${type.ext}`);

        const response = await fetch("https://catbox.moe/user/api.php", {
            method: "POST",
            headers: DEFAULT_HEADERS,
            body: formData,
            signal: AbortSignal.timeout(30000),
        });

        if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);

        const text = await response.text();
        if (!text.startsWith("http")) throw new Error("Invalid response from Catbox");

        return text.trim();
    } catch (e) {
        conn?.logger?.error(e.message);
        return null;
    }
}

async function uploader2(buffer) {
    try {
        if (!buffer || buffer.length === 0) throw new Error("Buffer cannot be empty");

        const type = await fileTypeFromBuffer(buffer);
        if (!type) throw new Error("Unrecognized file format");

        const formData = new FormData();
        const blob = new Blob([buffer], { type: type.mime });
        formData.append("files[]", blob, `upload.${type.ext}`);

        const response = await fetch("https://uguu.se/upload.php", {
            method: "POST",
            headers: DEFAULT_HEADERS,
            body: formData,
            signal: AbortSignal.timeout(30000),
        });

        if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);

        const json = await response.json();
        if (!json?.files?.[0]?.url) throw new Error("Invalid response from Uguu");

        return json.files[0].url.trim();
    } catch (e) {
        conn?.logger?.error(e.message);
        return null;
    }
}

async function uploader3(buffer) {
    try {
        if (!buffer || buffer.length === 0) throw new Error("Buffer cannot be empty");

        const type = await fileTypeFromBuffer(buffer);
        if (!type) throw new Error("Unrecognized file format");

        const formData = new FormData();
        const blob = new Blob([buffer], { type: type.mime });
        formData.append("files[]", blob, `upload.${type.ext}`);

        const response = await fetch("https://qu.ax/upload.php", {
            method: "POST",
            headers: DEFAULT_HEADERS,
            body: formData,
            signal: AbortSignal.timeout(30000),
        });

        if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);

        const json = await response.json();
        if (!json?.files?.[0]?.url) throw new Error("Invalid response from Qu.ax");

        return json.files[0].url.trim();
    } catch (e) {
        conn?.logger?.error(e.message);
        return null;
    }
}

async function uploader4(buffer) {
    try {
        if (!buffer || buffer.length === 0) throw new Error("Buffer cannot be empty");

        const type = await fileTypeFromBuffer(buffer);
        if (!type) throw new Error("Unrecognized file format");

        const response = await fetch("https://put.icu/upload/", {
            method: "PUT",
            headers: {
                ...DEFAULT_HEADERS,
                "Content-Type": type.mime,
                Accept: "application/json",
            },
            body: buffer,
            signal: AbortSignal.timeout(30000),
        });

        if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);

        const json = await response.json();
        if (!json?.direct_url) throw new Error("Invalid response from Put.icu");

        return json.direct_url.trim();
    } catch (e) {
        conn?.logger?.error(e.message);
        return null;
    }
}

async function uploader5(buffer) {
    try {
        if (!buffer || buffer.length === 0) throw new Error("Buffer cannot be empty");

        const type = await fileTypeFromBuffer(buffer);
        if (!type) throw new Error("Unrecognized file format");

        const formData = new FormData();
        const blob = new Blob([buffer], { type: type.mime });
        formData.append("file", blob, `upload.${type.ext}`);

        const response = await fetch("https://tmpfiles.org/api/v1/upload", {
            method: "POST",
            headers: DEFAULT_HEADERS,
            body: formData,
            signal: AbortSignal.timeout(30000),
        });

        if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);

        const json = await response.json();
        if (!json?.data?.url) throw new Error("Invalid response from Tmpfiles");

        return json.data.url.replace("/file/", "/dl/").trim();
    } catch (e) {
        conn?.logger?.error(e.message);
        return null;
    }
}

async function uploader(buffer) {
    const providers = [
        { name: "Catbox", fn: uploader1 },
        { name: "Uguu", fn: uploader2 },
        { name: "Qu.ax", fn: uploader3 },
        { name: "Put.icu", fn: uploader4 },
        { name: "Tmpfiles", fn: uploader5 },
    ];

    const results = {
        success: false,
        url: null,
        provider: null,
        attempts: [],
    };

    for (const provider of providers) {
        try {
            const url = await provider.fn(buffer);

            if (url) {
                results.success = true;
                results.url = url;
                results.provider = provider.name;
                results.attempts.push({ provider: provider.name, success: true });
                return results;
            }

            results.attempts.push({ provider: provider.name, success: false });
        } catch (error) {
            results.attempts.push({
                provider: provider.name,
                success: false,
                error: error.message,
            });
            continue;
        }
    }

    throw new Error(`All ${providers.length} providers failed`);
}

export { uploader1, uploader2, uploader3, uploader4, uploader5, uploader };
