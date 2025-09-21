import { fileTypeFromBuffer } from "file-type";

async function uploader(buffer) {
    if (!buffer) throw new Error("Buffer tidak boleh kosong");
    const { ext, mime } = (await fileTypeFromBuffer(buffer)) || {};
    if (!ext || !mime) throw new Error("Format file tidak dikenali");
    const file = new File([buffer], `upload.${ext}`, { type: mime });
    const form = new FormData();
    form.append("file", file);
    try {
        const res = await fetch("https://cloudkuimages.guru/upload.php", {
            method: "POST",
            body: form,
        });
        const json = await res.json();
        if (json?.status !== "success" || !json.data?.url) {
            throw new Error("Upload gagal atau response tidak valid");
        }
        return json.data.url;
    } catch (err) {
        console.error("UploaderCloudku gagal:", err);
        return null;
    }
}

export { uploader };
