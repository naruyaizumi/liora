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
    if (!text.startsWith("http")) throw new Error("Upload gagal atau response tidak valid");
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
    if (!json?.files?.[0]?.url) throw new Error("Upload gagal atau response tidak valid");
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
    if (!json?.files?.[0]?.url) throw new Error("Upload gagal atau response tidak valid");
    return json.files[0].url.trim();
}

async function uploader4(buffer) {
    if (!buffer) throw new Error("Buffer tidak boleh kosong");

    const type = await fileTypeFromBuffer(buffer);
    if (!type) throw new Error("Format file tidak dikenali");

    try {
        const res = await fetch("https://put.icu/upload/", {
            method: "PUT",
            headers: {
                ...DEFAULT_HEADERS,
                Accept: "application/json",
            },
            body: buffer,
        });

        const json = await res.json().catch(() => null);
        if (!json || !json.direct_url) {
            throw new Error("Upload gagal atau response tidak valid");
        }

        return json.direct_url.trim();
    } catch (err) {
        console.error("Uploader7 (Picu) error:", err.message || err);
        return null;
    }
}

async function uploader5(buffer) {
    if (!buffer) throw new Error("Buffer tidak boleh kosong");
    const type = await fileTypeFromBuffer(buffer);
    if (!type) throw new Error("Format file tidak dikenali");

    const blob = new Blob([buffer], { type: type.mime });
    const form = new FormData();
    form.append("file", blob, `upload.${type.ext}`);

    const res = await fetch("https://tmpfiles.org/api/v1/upload", {
        method: "POST",
        headers: DEFAULT_HEADERS,
        body: form,
    });

    const json = await res.json().catch(() => null);
    if (!json?.data?.url) throw new Error("Upload gagal atau response tidak valid dari Tmpfiles");
    return json.data.url.replace("/file/", "/dl/").trim();
}

async function uploader6(buffer, tmp = 'false') {
  if (!buffer) throw new Error('Buffer tidak boleh kosong');
  const { ext, mime } = (await fileTypeFromBuffer(buffer)) || {};
  if (!ext || !mime) throw new Error('Format file tidak didukung atau buffer rusak');

  const formData = new FormData();
  formData.append("file", new Blob([buffer], { type: mime }), `upload.${ext}`);
  formData.append("apikey", global.config.APIKeys['https://api.betabotz.eu.org']);
  formData.append("tmp", tmp);

  try {
    const res = await fetch("https://api.betabotz.eu.org/api/tools/upload", {
      method: "POST",
      body: formData
    });
    const data = await res.json();
    return data.result?.url || data.result || null;
  } catch (err) {
    console.error('Upload gagal:', err);
    return null;
  }
}

export { uploader, uploader2, uploader3, uploader4, uploader5, uploader6 };