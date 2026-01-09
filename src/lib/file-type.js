export async function fileType(buffer) {
  if (!buffer || buffer.length < 4) {
    return null;
  }

  return await Promise.resolve().then(() => {
    if (buffer.length >= 12) {
      const boxType = buffer.slice(4, 8).toString("ascii");
      if (boxType === "ftyp") {
        return { mime: "video/mp4", ext: "mp4" };
      }
    }

    if (
      buffer.length >= 12 &&
      buffer.slice(4, 8).toString("ascii") === "ftyp"
    ) {
      const brand = buffer.slice(8, 12).toString("ascii");
      if (brand === "qt  " || brand.includes("qt")) {
        return { mime: "video/quicktime", ext: "mov" };
      }
    }

    if (
      buffer.length >= 12 &&
      buffer[0] === 0x52 &&
      buffer[1] === 0x49 &&
      buffer[2] === 0x46 &&
      buffer[3] === 0x46 &&
      buffer[8] === 0x41 &&
      buffer[9] === 0x56 &&
      buffer[10] === 0x49 &&
      buffer[11] === 0x20
    ) {
      return { mime: "video/x-msvideo", ext: "avi" };
    }

    if (
      buffer.length >= 4 &&
      buffer[0] === 0x1a &&
      buffer[1] === 0x45 &&
      buffer[2] === 0xdf &&
      buffer[3] === 0xa3
    ) {
      return { mime: "video/webm", ext: "mkv" };
    }

    if (buffer.length >= 3) {
      if (buffer[0] === 0x49 && buffer[1] === 0x44 && buffer[2] === 0x33) {
        return { mime: "audio/mpeg", ext: "mp3" };
      }
      if (buffer[0] === 0xff && (buffer[1] & 0xe0) === 0xe0) {
        return { mime: "audio/mpeg", ext: "mp3" };
      }
    }

    if (
      buffer.length >= 12 &&
      buffer[0] === 0x52 &&
      buffer[1] === 0x49 &&
      buffer[2] === 0x46 &&
      buffer[3] === 0x46 &&
      buffer[8] === 0x57 &&
      buffer[9] === 0x41 &&
      buffer[10] === 0x56 &&
      buffer[11] === 0x45
    ) {
      return { mime: "audio/wav", ext: "wav" };
    }

    if (
      buffer.length >= 4 &&
      buffer[0] === 0x4f &&
      buffer[1] === 0x67 &&
      buffer[2] === 0x67 &&
      buffer[3] === 0x53
    ) {
      return { mime: "audio/ogg", ext: "ogg" };
    }

    if (
      buffer.length >= 12 &&
      buffer.slice(4, 8).toString("ascii") === "ftyp"
    ) {
      const brand = buffer.slice(8, 12).toString("ascii");
      if (brand === "M4A " || brand === "mp42") {
        return { mime: "audio/mp4", ext: "m4a" };
      }
    }

    if (
      buffer.length >= 2 &&
      buffer[0] === 0xff &&
      (buffer[1] & 0xf0) === 0xf0
    ) {
      return { mime: "audio/aac", ext: "aac" };
    }

    if (
      buffer.length >= 6 &&
      buffer[0] === 0x23 &&
      buffer[1] === 0x21 &&
      buffer[2] === 0x41 &&
      buffer[3] === 0x4d &&
      buffer[4] === 0x52 &&
      buffer[5] === 0x0a
    ) {
      return { mime: "audio/amr", ext: "amr" };
    }
    
    if (
      buffer.length >= 3 &&
      buffer[0] === 0xff &&
      buffer[1] === 0xd8 &&
      buffer[2] === 0xff
    ) {
      return { mime: "image/jpeg", ext: "jpg" };
    }

    if (
      buffer.length >= 8 &&
      buffer[0] === 0x89 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x4e &&
      buffer[3] === 0x47 &&
      buffer[4] === 0x0d &&
      buffer[5] === 0x0a &&
      buffer[6] === 0x1a &&
      buffer[7] === 0x0a
    ) {
      return { mime: "image/png", ext: "png" };
    }

    if (
      buffer.length >= 6 &&
      buffer[0] === 0x47 &&
      buffer[1] === 0x49 &&
      buffer[2] === 0x46 &&
      buffer[3] === 0x38 &&
      (buffer[4] === 0x37 || buffer[4] === 0x39) &&
      buffer[5] === 0x61
    ) {
      return { mime: "image/gif", ext: "gif" };
    }

    if (
      buffer.length >= 12 &&
      buffer[0] === 0x52 &&
      buffer[1] === 0x49 &&
      buffer[2] === 0x46 &&
      buffer[3] === 0x46 &&
      buffer[8] === 0x57 &&
      buffer[9] === 0x45 &&
      buffer[10] === 0x42 &&
      buffer[11] === 0x50
    ) {
      return { mime: "image/webp", ext: "webp" };
    }

    if (
      buffer.length >= 12 &&
      buffer.slice(4, 8).toString("ascii") === "ftyp"
    ) {
      const brand = buffer.slice(8, 12).toString("ascii");
      if (brand === "heic" || brand === "mif1") {
        return { mime: "image/heic", ext: "heic" };
      }
    }

    if (
      buffer.length >= 4 &&
      buffer[0] === 0x25 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x44 &&
      buffer[3] === 0x46
    ) {
      return { mime: "application/pdf", ext: "pdf" };
    }

    if (
      buffer.length >= 4 &&
      buffer[0] === 0x50 &&
      buffer[1] === 0x4b &&
      buffer[2] === 0x03 &&
      buffer[3] === 0x04
    ) {
      const bufferStr = buffer.toString(
        "latin1",
        0,
        Math.min(1000, buffer.length),
      );
      if (bufferStr.includes("[Content_Types].xml")) {
        if (bufferStr.includes("word/"))
          return {
            mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            ext: "docx",
          };
        if (bufferStr.includes("ppt/"))
          return {
            mime: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
            ext: "pptx",
          };
        if (bufferStr.includes("xl/"))
          return {
            mime: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            ext: "xlsx",
          };
      }
    }

    if (buffer.length > 0) {
      let asciiCount = 0;
      const checkLength = Math.min(100, buffer.length);
      for (let i = 0; i < checkLength; i++) {
        const byte = buffer[i];
        if (
          (byte >= 0x20 && byte <= 0x7e) ||
          byte === 0x09 ||
          byte === 0x0a ||
          byte === 0x0d
        ) {
          asciiCount++;
        }
      }
      if (asciiCount / checkLength > 0.95) {
        return { mime: "text/plain", ext: "txt" };
      }
    }

    if (
      buffer.length >= 4 &&
      buffer[0] === 0x50 &&
      buffer[1] === 0x4b &&
      buffer[2] === 0x03 &&
      buffer[3] === 0x04
    ) {
      return { mime: "application/zip", ext: "zip" };
    }

    if (
      buffer.length >= 7 &&
      ((buffer[0] === 0x52 &&
        buffer[1] === 0x61 &&
        buffer[2] === 0x72 &&
        buffer[3] === 0x21) ||
        (buffer[0] === 0x52 &&
          buffer[1] === 0x45 &&
          buffer[2] === 0x7e &&
          buffer[3] === 0x5e))
    ) {
      return { mime: "application/vnd.rar", ext: "rar" };
    }

    return null;
  });
}

export async function getCategory(type) {
  if (!type) return "unknown";

  return await Promise.resolve().then(() => {
    if (type.mime.startsWith("video/")) return "video";
    if (type.mime.startsWith("audio/")) return "audio";
    if (type.mime.startsWith("image/")) return "image";
    if (type.mime.startsWith("text/")) return "text";
    if (
      type.mime.includes("pdf") ||
      type.mime.includes("document") ||
      type.mime.includes("sheet") ||
      type.mime.includes("presentation")
    )
      return "document";
    if (type.mime.includes("zip") || type.mime.includes("rar"))
      return "archive";

    return "other";
  });
}

export async function getMime(ext) {
  const mimeMap = {
    mp4: "video/mp4",
    mov: "video/quicktime",
    avi: "video/x-msvideo",
    mkv: "video/webm",
    webm: "video/webm",
    flv: "video/x-flv",
    wmv: "video/x-ms-wmv",
    mp3: "audio/mpeg",
    wav: "audio/wav",
    ogg: "audio/ogg",
    m4a: "audio/mp4",
    aac: "audio/aac",
    amr: "audio/amr",
    flac: "audio/flac",
    opus: "audio/ogg",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    gif: "image/gif",
    webp: "image/webp",
    heic: "image/heic",
    bmp: "image/bmp",
    svg: "image/svg+xml",
    pdf: "application/pdf",
    doc: "application/msword",
    docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    xls: "application/vnd.ms-excel",
    xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ppt: "application/vnd.ms-powerpoint",
    pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    txt: "text/plain",
    zip: "application/zip",
    rar: "application/vnd.rar",
    "7z": "application/x-7z-compressed",
    tar: "application/x-tar",
    gz: "application/gzip",
  };

  return await Promise.resolve().then(() => {
    return mimeMap[ext] || "application/octet-stream";
  });
}

export async function getExtension(mime) {
  if (!mime) return "bin";

  const mimeToExt = {
    "video/mp4": "mp4",
    "video/quicktime": "mov",
    "video/x-msvideo": "avi",
    "video/webm": "webm",
    "video/x-matroska": "mkv",
    "audio/mpeg": "mp3",
    "audio/wav": "wav",
    "audio/ogg": "ogg",
    "audio/mp4": "m4a",
    "audio/aac": "aac",
    "audio/amr": "amr",
    "audio/flac": "flac",
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/gif": "gif",
    "image/webp": "webp",
    "image/heic": "heic",
    "image/bmp": "bmp",
    "image/svg+xml": "svg",
    "application/pdf": "pdf",
    "application/vnd.ms-excel": "xls",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
    "application/msword": "doc",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
      "docx",
    "application/vnd.ms-powerpoint": "ppt",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation":
      "pptx",
    "text/plain": "txt",
    "text/html": "html",
    "text/css": "css",
    "text/javascript": "js",
    "application/json": "json",
    "application/xml": "xml",
    "application/zip": "zip",
    "application/vnd.rar": "rar",
    "application/x-7z-compressed": "7z",
    "application/x-tar": "tar",
    "application/gzip": "gz",
    "application/octet-stream": "bin",
  };

  return mimeToExt[mime] || "bin";
}

export function formatBytes(bytes) {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

export function getBrowserHeaders() {
  return {
    "User-Agent":
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    Accept:
      "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
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
}

export function isImage(mime) {
  return mime && mime.startsWith("image/");
}

export function isVideo(mime) {
  return mime && mime.startsWith("video/");
}

export function isAudio(mime) {
  return mime && mime.startsWith("audio/");
}

export function isJson(mime) {
  return mime && (mime === "application/json" || mime.includes("+json"));
}

export function isHtml(mime) {
  return mime && (mime === "text/html" || mime.includes("html"));
}

export function isText(mime) {
  return mime && mime.startsWith("text/");
}

export function isDocument(mime) {
  return (
    mime &&
    (mime.includes("pdf") ||
      mime.includes("document") ||
      mime.includes("sheet") ||
      mime.includes("presentation") ||
      mime.includes("msword") ||
      mime.includes("excel") ||
      mime.includes("powerpoint"))
  );
}

export function isArchive(mime) {
  return (
    mime &&
    (mime.includes("zip") ||
      mime.includes("rar") ||
      mime.includes("tar") ||
      mime.includes("gzip") ||
      mime.includes("7z") ||
      mime.includes("compressed"))
  );
}
