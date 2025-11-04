/* global conn */
import { fileTypeFromBuffer } from "file-type";
import { fetch } from "liora-lib";

const DEFAULT_HEADERS = {
    "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/90.0.4430.212 Safari/537.36",
};

=> (async () => {
    const { fetch } = await import("liora-lib")
    const buffer = await m.quoted.download()
    const { fileTypeFromBuffer } = await import('file-type')
    const type = await fileTypeFromBuffer(buffer) || { ext: 'png', mime: 'image/png' }
    const res = await fetch("https://catbox.moe/user/api.php", { method: "POST", formData: { reqtype: "fileupload", fileToUpload: { value: buffer, filename: `upload.${type.ext}`, contentType: type.mime } } })
    const text = await res.text()
    await conn.sendMessage(m.chat, { text: text.trim() })
})()



async function uploader(buffer) {
    if (!buffer) throw new Error("Buffer cannot be empty.");
    const type = await fileTypeFromBuffer(buffer);
    if (!type) throw new Error("Unrecognized file format.");

    try {
        const res = await fetch("https://catbox.moe/user/api.php", {
            method: "POST",
            headers: DEFAULT_HEADERS,
            formData: {
                reqtype: "fileupload",
                fileToUpload: {
                    value: buffer,
                    filename: `upload.${type.ext}`,
                    contentType: type.mime,
                },
            },
        });

        const text = await res.text();
        if (!text.startsWith("http"))
            throw new Error("Upload failed or invalid response from Catbox.");
        return text.trim();
    } catch (e) {
        conn.logger.error(e);
        return null;
    }
}

async function uploader2(buffer) {
    if (!buffer) throw new Error("Buffer cannot be empty.");
    const type = await fileTypeFromBuffer(buffer);
    if (!type) throw new Error("Unrecognized file format.");

    try {
        const res = await fetch("https://uguu.se/upload.php", {
            method: "POST",
            headers: DEFAULT_HEADERS,
            formData: {
                "files[]": {
                    value: buffer,
                    filename: `upload.${type.ext}`,
                    contentType: type.mime,
                },
            },
        });

        const json = await res.json().catch(() => null);
        if (!json?.files?.[0]?.url) throw new Error("Upload failed or invalid response from Uguu.");
        return json.files[0].url.trim();
    } catch (e) {
        conn.logger.error(e);
        return null;
    }
}

async function uploader3(buffer) {
    if (!buffer) throw new Error("Buffer cannot be empty.");
    const type = await fileTypeFromBuffer(buffer);
    if (!type) throw new Error("Unrecognized file format.");

    try {
        const res = await fetch("https://qu.ax/upload.php", {
            method: "POST",
            headers: DEFAULT_HEADERS,
            formData: {
                "files[]": {
                    value: buffer,
                    filename: `upload.${type.ext}`,
                    contentType: type.mime,
                },
            },
        });

        const json = await res.json().catch(() => null);
        if (!json?.files?.[0]?.url)
            throw new Error("Upload failed or invalid response from Qu.ax.");
        return json.files[0].url.trim();
    } catch (e) {
        conn.logger.error(e);
        return null;
    }
}

async function uploader4(buffer) {
    if (!buffer) throw new Error("Buffer cannot be empty.");
    const type = await fileTypeFromBuffer(buffer);
    if (!type) throw new Error("Unrecognized file format.");

    try {
        const res = await fetch("https://put.icu/upload/", {
            method: "PUT",
            headers: { ...DEFAULT_HEADERS, Accept: "application/json" },
            body: buffer,
        });

        const json = await res.json().catch(() => null);
        if (!json?.direct_url) throw new Error("Upload failed or invalid response from Put.icu.");
        return json.direct_url.trim();
    } catch (e) {
        conn.logger.error(e);
        return null;
    }
}

async function uploader5(buffer) {
    if (!buffer) throw new Error("Buffer cannot be empty.");
    const type = await fileTypeFromBuffer(buffer);
    if (!type) throw new Error("Unrecognized file format.");

    try {
        const res = await fetch("https://tmpfiles.org/api/v1/upload", {
            method: "POST",
            headers: DEFAULT_HEADERS,
            formData: {
                file: {
                    value: buffer,
                    filename: `upload.${type.ext}`,
                    contentType: type.mime,
                },
            },
        });

        const json = await res.json().catch(() => null);
        if (!json?.data?.url) throw new Error("Upload failed or invalid response from Tmpfiles.");
        return json.data.url.replace("/file/", "/dl/").trim();
    } catch (e) {
        conn.logger.error(e);
        return null;
    }
}

export { uploader, uploader2, uploader3, uploader4, uploader5 };
