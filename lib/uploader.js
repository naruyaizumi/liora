import { fileTypeFromBuffer } from "file-type"

async function uploader(buffer) {
  if (!buffer) throw new Error("Buffer tidak boleh kosong")

  const type = await fileTypeFromBuffer(buffer)
  if (!type) throw new Error("Format file tidak dikenali")

  const blob = new Blob([buffer], { type: type.mime })
  const form = new FormData()
  form.append("file", blob, `upload.${type.ext}`)

  const res = await fetch("https://cloudkuimages.guru/upload.php", {
    method: "POST",
    body: form,
  })

  const json = await res.json().catch(() => null)
  if (!json || json.status !== "success" || !json.url) {
    throw new Error("Upload gagal atau response tidak valid")
  }

  return json.url
}

export { uploader }