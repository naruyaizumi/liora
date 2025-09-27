import { fileTypeFromBuffer } from "file-type";

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
        body: form,
    });

    const text = await res.text();
    if (!text.startsWith("http")) {
        throw new Error("Upload gagal atau response tidak valid");
    }

    return text.trim();
}

export { uploader };