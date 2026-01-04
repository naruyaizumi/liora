/* global conn */
import { fileType, getBrowserHeaders } from "./file-type.js";

async function uploader1(buffer) {
  try {
    if (!buffer || buffer.length === 0)
      throw new Error("Buffer cannot be empty");

    const type = await fileType(buffer);
    if (!type) throw new Error("Unrecognized file format");

    const formData = new FormData();
    formData.append("reqtype", "fileupload");
    const blob = new Blob([buffer], { type: type.mime });
    formData.append("fileToUpload", blob, `upload.${type.ext}`);

    const response = await fetch("https://catbox.moe/user/api.php", {
      method: "POST",
      headers: getBrowserHeaders(),
      body: formData,
      signal: AbortSignal.timeout(60000),
    });

    if (!response.ok)
      throw new Error(`Catbox HTTP ${response.status}: ${response.statusText}`);

    const text = await response.text();
    if (!text.startsWith("http"))
      throw new Error(`Catbox invalid response: ${text.substring(0, 100)}`);

    return text.trim();
  } catch (e) {
    conn?.logger?.error(e.message);
    throw e;
  }
}

async function uploader2(buffer) {
  try {
    if (!buffer || buffer.length === 0)
      throw new Error("Buffer cannot be empty");

    const type = fileType(buffer);
    if (!type) throw new Error("Unrecognized file format");

    const formData = new FormData();
    const blob = new Blob([buffer], { type: type.mime });
    formData.append("files[]", blob, `upload.${type.ext}`);

    const response = await fetch("https://uguu.se/upload.php", {
      method: "POST",
      headers: getBrowserHeaders(),
      body: formData,
      signal: AbortSignal.timeout(60000),
    });

    if (!response.ok)
      throw new Error(`Uguu HTTP ${response.status}: ${response.statusText}`);

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
    if (!buffer || buffer.length === 0)
      throw new Error("Buffer cannot be empty");

    const type = fileType(buffer);
    if (!type) throw new Error("Unrecognized file format");

    const formData = new FormData();
    const blob = new Blob([buffer], { type: type.mime });
    formData.append("files[]", blob, `upload.${type.ext}`);

    const response = await fetch("https://qu.ax/upload.php", {
      method: "POST",
      headers: getBrowserHeaders(),
      body: formData,
      signal: AbortSignal.timeout(60000),
    });

    if (!response.ok)
      throw new Error(`Qu.ax HTTP ${response.status}: ${response.statusText}`);

    const json = await response.json();
    if (!json?.files?.[0]?.url)
      throw new Error("Qu.ax invalid response format");

    return json.files[0].url.trim();
  } catch (e) {
    conn?.logger?.error(e.message);
    throw e;
  }
}

async function uploader4(buffer) {
  try {
    if (!buffer || buffer.length === 0)
      throw new Error("Buffer cannot be empty");

    const type = fileType(buffer);
    if (!type) throw new Error("Unrecognized file format");

    const response = await fetch("https://put.icu/upload/", {
      method: "PUT",
      headers: {
        ...getBrowserHeaders(),
        "Content-Type": type.mime,
        Accept: "application/json",
      },
      body: buffer,
      signal: AbortSignal.timeout(60000),
    });

    if (!response.ok)
      throw new Error(
        `Put.icu HTTP ${response.status}: ${response.statusText}`,
      );

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
    if (!buffer || buffer.length === 0)
      throw new Error("Buffer cannot be empty");

    const type = fileType(buffer);
    if (!type) throw new Error("Unrecognized file format");

    const formData = new FormData();
    const blob = new Blob([buffer], { type: type.mime });
    formData.append("file", blob, `upload.${type.ext}`);

    const response = await fetch("https://tmpfiles.org/api/v1/upload", {
      method: "POST",
      headers: getBrowserHeaders(),
      body: formData,
      signal: AbortSignal.timeout(60000),
    });

    if (!response.ok)
      throw new Error(
        `Tmpfiles HTTP ${response.status}: ${response.statusText}`,
      );

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
    if (!buffer || buffer.length === 0)
      throw new Error("Buffer cannot be empty");

    const type = fileType(buffer);
    if (!type) throw new Error("Unrecognized file format");
    if (!type.mime.startsWith("video/")) {
      throw new Error(
        "Videy uploader only supports videos (MP4, MOV, AVI, MKV)",
      );
    }

    const formData = new FormData();
    const blob = new Blob([buffer], { type: type.mime });
    formData.append("file", blob, `upload.${type.ext}`);
    formData.append("apikey", "freeApikey");

    const response = await fetch("https://anabot.my.id/api/tools/videy", {
      method: "POST",
      headers: {
        Accept: "*/*",
      },
      body: formData,
      signal: AbortSignal.timeout(60000),
    });

    if (!response.ok)
      throw new Error(`Videy HTTP ${response.status}: ${response.statusText}`);

    const json = await response.json();

    if (!json?.success || !json?.data?.result?.link) {
      throw new Error("Videy invalid response format");
    }

    return json.data.result.link.trim();
  } catch (e) {
    conn?.logger?.error(e.message);
    throw e;
  }
}

async function uploader7(buffer) {
  try {
    if (!buffer || buffer.length === 0)
      throw new Error("Buffer cannot be empty");

    const type = fileType(buffer);
    if (!type) throw new Error("Unrecognized file format");
    if (!type.mime.startsWith("image/")) {
      throw new Error(
        "GoFile uploader only supports images (JPG, PNG, GIF, WEBP, HEIC)",
      );
    }

    const formData = new FormData();
    const blob = new Blob([buffer], { type: type.mime });
    formData.append("file", blob, `upload.${type.ext}`);
    formData.append("apikey", "freeApikey");

    const response = await fetch("https://anabot.my.id/api/tools/goFile", {
      method: "POST",
      headers: {
        Accept: "*/*",
      },
      body: formData,
      signal: AbortSignal.timeout(60000),
    });

    if (!response.ok)
      throw new Error(`GoFile HTTP ${response.status}: ${response.statusText}`);

    const json = await response.json();

    if (!json?.success || !json?.data?.result?.imageUrl) {
      throw new Error("GoFile invalid response format");
    }

    return json.data.result.imageUrl.trim();
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
  ];

  const attempts = [];

  for (const provider of providers) {
    try {
      const url = await provider.fn(buffer);

      if (url && typeof url === "string" && url.startsWith("http")) {
        attempts.push({
          provider: provider.name,
          status: "success",
          url,
        });

        return {
          success: true,
          url,
          provider: provider.name,
          attempts,
        };
      }

      attempts.push({
        provider: provider.name,
        status: "invalid_response",
      });
    } catch (e) {
      attempts.push({
        provider: provider.name,
        status: "error",
        error: e.message,
      });
      conn?.logger?.error(`${provider.name}: ${e.message}`);
      continue;
    }
  }

  conn?.logger?.error("All upload providers failed");
  attempts.forEach((a) =>
    conn?.logger?.error(`  - ${a.provider}: ${a.status}`),
  );

  return {
    success: false,
    url: null,
    provider: null,
    attempts,
  };
}

export {
  uploader1,
  uploader2,
  uploader3,
  uploader4,
  uploader5,
  uploader6,
  uploader7,
  uploader,
};
