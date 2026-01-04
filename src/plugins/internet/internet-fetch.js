import {
  fileType,
  getExtension,
  formatBytes,
  getBrowserHeaders,
  isImage,
  isVideo,
  isAudio,
  isJson,
  isHtml,
} from "#lib/file-type.js";

let handler = async (m, { conn, text, usedPrefix, command }) => {
  const startTime = Date.now();

  if (!text || !/^https?:\/\//i.test(text.trim())) {
    return m.reply(
      `\`\`\`Usage: ${usedPrefix + command} <url>\n\nExample: ${usedPrefix + command} https://example.com\`\`\``,
    );
  }

  const originalUrl = text.trim();
  await global.loading(m, conn);

  const fetchOptions = {
    method: "GET",
    headers: getBrowserHeaders(),
    redirect: "follow",
    signal: AbortSignal.timeout(30000),
  };

  try {
    const response = await fetch(originalUrl, fetchOptions);
    const fetchTime = Date.now() - startTime;

    const finalUrl = response.url;
    const wasRedirected = response.redirected || finalUrl !== originalUrl;

    if (!response.ok) {
      const errorText = await Bun.readableStreamToText(response.body).catch(
        () => "",
      );
      const errorMsg = `\`\`\`HTTP Error ${response.status}

Request URL: ${originalUrl}
${
  wasRedirected
    ? `Final URL: ${finalUrl}
`
    : ""
}Status: ${response.status} ${response.statusText}
Time: ${fetchTime}ms
Content-Type: ${response.headers.get("content-type") || "unknown"}
Content-Length: ${response.headers.get("content-length") || "unknown"}

Response Preview:
${errorText.substring(0, 200)}${errorText.length > 200 ? "..." : ""}\`\`\``;
      return m.reply(errorMsg);
    }

    const contentType =
      response.headers.get("content-type") || "application/octet-stream";
    const contentLength = response.headers.get("content-length");
    const contentEncoding = response.headers.get("content-encoding");
    const server = response.headers.get("server");
    const date = response.headers.get("date");
    const processingStart = Date.now();
    const uint8Array = await Bun.readableStreamToBytes(response.body);
    const buffer = Buffer.from(uint8Array);
    const processingTime = Date.now() - processingStart;
    const detectedType = await fileType(buffer);

    let mime = contentType.split(";")[0].trim();
    let ext = "bin";
    if (detectedType) {
      mime = detectedType.mime;
      ext = detectedType.ext;
    } else {
      ext = (await getExtension(mime)) || "bin";
    }

    const jsonCheck = isJson(mime);
    const imageCheck = isImage(mime);
    const videoCheck = isVideo(mime);
    const audioCheck = isAudio(mime);
    const htmlCheck = isHtml(mime);

    const totalTime = Date.now() - startTime;
    const transferRate = formatBytes(buffer.length / (totalTime / 1000)) + "/s";

    let contentTypeInfo = "";
    if (jsonCheck) {
      try {
        const jsonContent = JSON.parse(buffer.toString("utf-8", 0, 50000));
        contentTypeInfo = `JSON Type: ${Array.isArray(jsonContent) ? "Array" : typeof jsonContent}
JSON Keys: ${
          Object.keys(jsonContent).length > 5
            ? Object.keys(jsonContent).slice(0, 5).join(", ") + "..."
            : Object.keys(jsonContent).join(", ")
        }
`;
      } catch {
        contentTypeInfo = "JSON Type: Invalid/Malformed\n";
      }
    } else if (htmlCheck) {
      const textContent = buffer.toString("utf-8", 0, 50000);
      const titleMatch = textContent.match(/<title[^>]*>([^<]+)<\/title>/i);
      contentTypeInfo = `HTML Title: ${titleMatch ? titleMatch[1].substring(0, 50) : "Not found"}
`;
    }

    const caption = `FETCH REPORT

URL: ${originalUrl}
Final URL: ${finalUrl}
Redirected: ${wasRedirected ? "Yes" : "No"}

Status: ${response.status} ${response.statusText}
Server: ${server || "Unknown"}
Date: ${date || "Not specified"}

Content-Type: ${contentType}
Content-Encoding: ${contentEncoding || "none"}
Content-Length: ${contentLength ? formatBytes(parseInt(contentLength)) : formatBytes(buffer.length)}
Detected MIME: ${mime}
File Extension: .${ext}
Detection Method: ${detectedType ? "Signature-based" : "Header-based"}

Type Detection:
${imageCheck ? "✓ Image" : "✗ Image"}
${videoCheck ? "✓ Video" : "✗ Video"} 
${audioCheck ? "✓ Audio" : "✗ Audio"}
${jsonCheck ? "✓ JSON" : "✗ JSON"}
${htmlCheck ? "✓ HTML" : "✗ HTML"}

Total Time: ${totalTime}ms
Network Time: ${fetchTime}ms
Processing Time: ${processingTime}ms
Transfer Rate: ${transferRate}

Buffer Size: ${formatBytes(buffer.length)}
${contentTypeInfo}`;

    let msg;
    if (imageCheck && buffer.length > 1000) {
      msg = { image: buffer, caption: caption };
    } else if (videoCheck && buffer.length > 10000) {
      msg = { video: buffer, caption: caption };
    } else if (audioCheck && buffer.length > 1000) {
      msg = { audio: buffer, mimetype: mime, caption: caption };
    } else {
      const fileName = `result.${ext}`;
      msg = {
        document: buffer,
        mimetype: mime,
        fileName: fileName,
        caption: caption,
      };
    }

    await conn.sendMessage(m.chat, msg, { quoted: m });
  } catch (e) {
    const errorMsg = `\`\`\`FETCH ERROR

Request URL: ${originalUrl}
Error Type: ${e.name}
Error Message: ${e.message}
Time Elapsed: ${Date.now() - startTime}ms\`\`\``;

    m.reply(errorMsg);
  } finally {
    await global.loading(m, conn, true);
  }
};

handler.help = ["fetch"];
handler.tags = ["internet"];
handler.command = /^(fetch|get)$/i;

export default handler;
