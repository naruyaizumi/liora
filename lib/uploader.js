import { fileTypeFromBuffer } from "file-type"
import { fetch } from "../src/bridge.js"

const DEFAULT_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/90.0.4430.212 Safari/537.36",
}

async function uploader(buffer) {
  if (!buffer) throw new Error("Buffer tidak boleh kosong")
  const type = await fileTypeFromBuffer(buffer)
  if (!type) throw new Error("Format file tidak dikenali")

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
    })

    const text = await res.text()
    if (!text.startsWith("http")) throw new Error("Upload gagal atau response tidak valid dari Catbox")
    return text.trim()
  } catch (err) {
    console.error("Uploader1 (Catbox) error:", err.message || err)
    return null
  }
}

async function uploader2(buffer) {
  if (!buffer) throw new Error("Buffer tidak boleh kosong")
  const type = await fileTypeFromBuffer(buffer)
  if (!type) throw new Error("Format file tidak dikenali")

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
    })

    const json = await res.json().catch(() => null)
    if (!json?.files?.[0]?.url) throw new Error("Upload gagal atau response tidak valid dari Uguu")
    return json.files[0].url.trim()
  } catch (err) {
    console.error("Uploader2 (Uguu) error:", err.message || err)
    return null
  }
}

async function uploader3(buffer) {
  if (!buffer) throw new Error("Buffer tidak boleh kosong")
  const type = await fileTypeFromBuffer(buffer)
  if (!type) throw new Error("Format file tidak dikenali")

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
    })

    const json = await res.json().catch(() => null)
    if (!json?.files?.[0]?.url) throw new Error("Upload gagal atau response tidak valid dari Qu.ax")
    return json.files[0].url.trim()
  } catch (err) {
    console.error("Uploader3 (Qu.ax) error:", err.message || err)
    return null
  }
}

async function uploader4(buffer) {
  if (!buffer) throw new Error("Buffer tidak boleh kosong")
  const type = await fileTypeFromBuffer(buffer)
  if (!type) throw new Error("Format file tidak dikenali")

  try {
    const res = await fetch("https://put.icu/upload/", {
      method: "PUT",
      headers: { ...DEFAULT_HEADERS, Accept: "application/json" },
      body: buffer,
    })

    const json = await res.json().catch(() => null)
    if (!json?.direct_url) throw new Error("Upload gagal atau response tidak valid dari Put.icu")
    return json.direct_url.trim()
  } catch (err) {
    console.error("Uploader4 (Put.icu) error:", err.message || err)
    return null
  }
}

async function uploader5(buffer) {
  if (!buffer) throw new Error("Buffer tidak boleh kosong")
  const type = await fileTypeFromBuffer(buffer)
  if (!type) throw new Error("Format file tidak dikenali")

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
    })

    const json = await res.json().catch(() => null)
    if (!json?.data?.url) throw new Error("Upload gagal atau response tidak valid dari Tmpfiles")
    return json.data.url.replace("/file/", "/dl/").trim()
  } catch (err) {
    console.error("Uploader5 (Tmpfiles) error:", err.message || err)
    return null
  }
}

async function uploader6(buffer, tmp = "false") {
  if (!buffer) throw new Error("Buffer tidak boleh kosong")
  const { ext, mime } = (await fileTypeFromBuffer(buffer)) || {}
  if (!ext || !mime) throw new Error("Format file tidak dikenali")

  try {
    const res = await fetch("https://api.betabotz.eu.org/api/tools/upload", {
      method: "POST",
      formData: {
        file: {
          value: buffer,
          filename: `upload.${ext}`,
          contentType: mime,
        },
        apikey: global.config.APIKeys["https://api.betabotz.eu.org"],
        tmp,
      },
    })

    const json = await res.json().catch(() => null)
    if (!json?.result) throw new Error("Upload gagal atau response tidak valid dari Betabotz")
    return json.result.url || json.result || null
  } catch (err) {
    console.error("Uploader6 (Betabotz) error:", err.message || err)
    return null
  }
}

async function uploader7(buffer) {
  if (!buffer) throw new Error("Buffer tidak boleh kosong")
  const type = await fileTypeFromBuffer(buffer)
  if (!type) throw new Error("Format file tidak dikenali")

  try {
    const res = await fetch("https://cdn.yupra.my.id/upload", {
      method: "POST",
      headers: { "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36" },
      formData: {
        files: {
          value: buffer,
          filename: `upload.${type.ext}`,
          contentType: type.mime,
        },
      },
    })

    const json = await res.json().catch(() => null)
    if (!json?.success || !json.files?.[0]?.url)
      throw new Error("Upload gagal atau response tidak valid dari Yupra")
    return `https://cdn.yupra.my.id${json.files[0].url}`.trim()
  } catch (err) {
    console.error("Uploader7 (Yupra) error:", err.message || err)
    return null
  }
}

async function uploader8(buffer) {
  if (!buffer) throw new Error("Buffer tidak boleh kosong")
  const type = await fileTypeFromBuffer(buffer)
  if (!type) throw new Error("Format file tidak dikenali")

  try {
    const res = await fetch("https://cloudkuimages.guru/upload.php", {
      method: "POST",
      headers: DEFAULT_HEADERS,
      formData: {
        file: {
          value: buffer,
          filename: `upload.${type.ext}`,
          contentType: type.mime,
        },
      },
    })

    const json = await res.json().catch(() => null)
    if (!json || json.status !== "success" || !json.url)
      throw new Error("Upload gagal atau response tidak valid dari CloudkuImages")
    return json.url.trim()
  } catch (err) {
    console.error("Uploader8 (CloudkuImages) error:", err.message || err)
    return null
  }
}

export {
  uploader,
  uploader2,
  uploader3,
  uploader4,
  uploader5,
  uploader6,
  uploader7,
  uploader8,
}