import { fileTypeFromBuffer } from "file-type";

const DEFAULT_HEADERS = {
    "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/90.0.4430.212 Safari/537.36",
};

async function uploader(buffer) {
    if (!buffer) throw new Error("Buffer tidak boleh kosong");

    const type = await fileTypeFromBuffer(buffer);
    if (!type) throw new Error("Format file tidak dikenali");

    const blob = new Blob([buffer], { type: type.mime });
    const form = new FormData();
    form.append("reqtype", "fileupload");
    form.append("fileToUpload", blob, `upload.${type.ext}`);

    const res = await fetch("https://catbox.moe/user/api.php", {
        method: "POST",
        headers: DEFAULT_HEADERS,
        body: form,
    });

    const text = await res.text();
    if (!text.startsWith("http")) {
        throw new Error("Upload gagal atau response tidak valid");
    }

    return text.trim();
}

async function uploader2(buffer) {
    if (!buffer) throw new Error("Buffer tidak boleh kosong");

    const type = await fileTypeFromBuffer(buffer);
    if (!type) throw new Error("Format file tidak dikenali");

    const blob = new Blob([buffer], { type: type.mime });
    const form = new FormData();
    form.append("files[]", blob, `upload.${type.ext}`);

    const res = await fetch("https://uguu.se/upload.php", {
        method: "POST",
        headers: DEFAULT_HEADERS,
        body: form,
    });

    const json = await res.json().catch(() => null);
    if (!json || !json.files || !json.files[0] || !json.files[0].url) {
        throw new Error("Upload gagal atau response tidak valid");
    }

    return json.files[0].url.trim();
}

async function uploader3(buffer) {
    if (!buffer) throw new Error("Buffer tidak boleh kosong");

    const type = await fileTypeFromBuffer(buffer);
    if (!type) throw new Error("Format file tidak dikenali");

    const blob = new Blob([buffer], { type: type.mime });
    const form = new FormData();
    form.append("files[]", blob, `upload.${type.ext}`);

    const res = await fetch("https://qu.ax/upload.php", {
        method: "POST",
        headers: DEFAULT_HEADERS,
        body: form,
    });

    const json = await res.json().catch(() => null);
    if (!json || !json.files || !json.files[0] || !json.files[0].url) {
        throw new Error("Upload gagal atau response tidak valid");
    }

    return json.files[0].url.trim();
}

export { uploader, uploader2, uploader3 };