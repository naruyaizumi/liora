/* global conn */
import { fileTypeFromBuffer } from "file-type";

const DEFAULT_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    Accept: "*/*",
    "Accept-Language": "en-US,en;q=0.9",
    "Accept-Encoding": "gzip, deflate, br",
    "Cache-Control": "no-cache",
    Pragma: "no-cache",
};

const UPLOAD_TIMEOUT = 60000;

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
            signal: AbortSignal.timeout(UPLOAD_TIMEOUT),
        });
        
        if (!response.ok) throw new Error(`Catbox HTTP ${response.status}: ${response.statusText}`);
        
        const text = await response.text();
        if (!text.startsWith("http")) throw new Error(`Catbox invalid response: ${text.substring(0, 100)}`);
        
        return text.trim();
    } catch (e) {
        conn?.logger?.error(e.message);
        throw e;
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
            signal: AbortSignal.timeout(UPLOAD_TIMEOUT),
        });
        
        if (!response.ok) throw new Error(`Uguu HTTP ${response.status}: ${response.statusText}`);
        
        const json = await response.json();
        if (!json?.files?.[0]?.url) throw new Error("Uguu invalid response format");
        
        return json.files[0].url.trim();
    } catch (e) {
        conn?.logger?.error(e.message);
        throw e;
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
            signal: AbortSignal.timeout(UPLOAD_TIMEOUT),
        });
        
        if (!response.ok) throw new Error(`Qu.ax HTTP ${response.status}: ${response.statusText}`);
        
        const json = await response.json();
        if (!json?.files?.[0]?.url) throw new Error("Qu.ax invalid response format");
        
        return json.files[0].url.trim();
    } catch (e) {
        conn?.logger?.error(e.message);
        throw e;
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
            signal: AbortSignal.timeout(UPLOAD_TIMEOUT),
        });
        
        if (!response.ok) throw new Error(`Put.icu HTTP ${response.status}: ${response.statusText}`);
        
        const json = await response.json();
        if (!json?.direct_url) throw new Error("Put.icu invalid response format");
        
        return json.direct_url.trim();
    } catch (e) {
        conn?.logger?.error(e.message);
        throw e;
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
            signal: AbortSignal.timeout(UPLOAD_TIMEOUT),
        });
        
        if (!response.ok) throw new Error(`Tmpfiles HTTP ${response.status}: ${response.statusText}`);
        
        const json = await response.json();
        if (!json?.data?.url) throw new Error("Tmpfiles invalid response format");
        
        return json.data.url.replace("/file/", "/dl/").trim();
    } catch (e) {
        conn?.logger?.error(e.message);
        throw e;
    }
}

async function uploader6(buffer) {
    try {
        if (!buffer || buffer.length === 0) throw new Error("Buffer cannot be empty");

        const type = await fileTypeFromBuffer(buffer);
        if (!type) throw new Error("Unrecognized file format");

        const filename = `upload_${Date.now()}`;
        const uploadId = `upload_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        const formData = new FormData();
        const blob = new Blob([buffer], { type: type.mime });
        formData.append("file", blob, `${filename}.${type.ext}`);
        formData.append("filename", filename);
        formData.append("expire_value", "30");
        formData.append("expire_unit", "minutes");
        formData.append("upload_id", uploadId);

        const response = await fetch("https://nauval.cloud/upload", {
            method: "POST",
            headers: {
                "Accept": "application/json",
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            },
            body: formData,
            signal: AbortSignal.timeout(60000),
        });

        if (!response.ok) {
            throw new Error(`Nauval HTTP ${response.status}: ${response.statusText}`);
        }

        const json = await response.json();
        if (!json?.file_url) {
            throw new Error("Nauval invalid response format");
        }

        return json.file_url.trim();
    } catch (e) {
        conn?.logger?.error(e.message);
        throw e;
    }
}

async function uploader7(buffer) {
    try {
        if (!buffer || buffer.length === 0) throw new Error("Buffer cannot be empty");

        const type = await fileTypeFromBuffer(buffer);
        if (!type) throw new Error("Unrecognized file format");

        const formData = new FormData();
        const blob = new Blob([buffer], { type: type.mime });
        formData.append("file", blob, `file.${type.ext}`);

        const response = await fetch("https://api.deline.web.id/uploader", {
            method: "POST",
            headers: DEFAULT_HEADERS,
            body: formData,
            signal: AbortSignal.timeout(30000),
        });

        if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);

        const data = await response.json();

        if (data.status === false) {
            throw new Error(data.message || data.error || "Upload failed");
        }

        const link = data?.result?.link || data?.url || data?.path;
        if (!link) throw new Error("Invalid response (no link found)");

        return String(link).trim();
    } catch (e) {
        conn?.logger?.error(e.message);
        throw e;
    }
}

async function uploader8(buffer) {
    try {
        if (!buffer || buffer.length === 0)
            throw new Error("Buffer cannot be empty");

        const type = await fileTypeFromBuffer(buffer);
        if (!type)
            throw new Error("Unrecognized file format");

        const formData = new FormData();
        const blob = new Blob([buffer], { type: type.mime });
        formData.append("file", blob, `upload.${type.ext}`);

        const response = await fetch("https://zenitsu.web.id/api/tools/upload", {
            method: "POST",
            headers: DEFAULT_HEADERS,
            body: formData,
            signal: AbortSignal.timeout(UPLOAD_TIMEOUT),
        });

        if (!response.ok)
            throw new Error(`Zenitsu HTTP ${response.status}: ${response.statusText}`);

        const json = await response.json();

        if (!json?.results?.url)
            throw new Error("Zenitsu invalid response format");

        return json.results.url.trim();

    } catch (e) {
        conn?.logger?.error(e.message);
        throw e;
    }
}

async function uploader9(buffer) {
    try {
        if (!buffer || buffer.length === 0)
            throw new Error("Buffer cannot be empty");

        const type = await fileTypeFromBuffer(buffer);
        if (!type)
            throw new Error("Unrecognized file format");

        const formData = new FormData();
        const blob = new Blob([buffer], { type: type.mime });

        formData.append("file", blob, `upload.${type.ext}`);

        const response = await fetch("https://cloudkuimages.guru/upload.php", {
            method: "POST",
            headers: {
                ...DEFAULT_HEADERS,
                "Origin": "https://cloudkuimages.guru",
                "Referer": "https://cloudkuimages.guru/"
            },
            body: formData,
            signal: AbortSignal.timeout(UPLOAD_TIMEOUT),
        });

        if (!response.ok)
            throw new Error(`CloudKuImages HTTP ${response.status}: ${response.statusText}`);

        const json = await response.json();

        if (!json?.data?.url)
            throw new Error("CloudKuImages invalid response format");

        return json.data.url.trim();

    } catch (e) {
        conn?.logger?.error(e.message);
        throw e;
    }
}

async function uploader(buffer) {
    const providers = [
        { name: "Catbox", fn: uploader1 },
        { name: "Uguu", fn: uploader2 },
        { name: "Qu.ax", fn: uploader3 },
        { name: "Put.icu", fn: uploader4 },
        { name: "Tmpfiles", fn: uploader5 },
        { name: "Nauval.cloud", fn: uploader6 },
        { name: "Deline", fn: uploader7 },
        { name: "Zenitsu", fn: uploader8 },
        { name: "CloudKuImages", fn: uploader9 },
    ];
    
    const attempts = [];
    
    for (const provider of providers) {
        try {
            const url = await provider.fn(buffer);
            
            if (url && typeof url === "string" && url.startsWith("http")) {
                attempts.push({ provider: provider.name, status: "success", url });
                
                return {
                    success: true,
                    url,
                    provider: provider.name,
                    attempts
                };
            }
            
            attempts.push({ provider: provider.name, status: "invalid_response" });
        } catch (e) {
            attempts.push({ provider: provider.name, status: "error", error: e.message });
            conn?.logger?.error(`${provider.name}: ${e.message}`);
            continue;
        }
    }
    
    conn?.logger?.error("All upload providers failed");
    attempts.forEach((a) => conn?.logger?.error(`  - ${a.provider}: ${a.status}`));
    
    return {
        success: false,
        url: null,
        provider: null,
        attempts
    };
}

export {
    uploader1, uploader2, uploader3, uploader4,
    uploader5, uploader6, uploader7, uploader8,
    uploader9, uploader
};