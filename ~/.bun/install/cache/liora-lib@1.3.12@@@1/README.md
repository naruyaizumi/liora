# liora-lib for Liora Script

![Liora](https://qu.ax/Gamil.jpg)

**NOTE:** This library is **Linux-exclusive** and requires native dependencies. Running on other operating systems (Windows, macOS) or non-x64 architectures will fail.
All prebuilt binaries are compiled for **Ubuntu 24.04 LTS (x64) & Debian 12 (x64)**. Errors outside this environment are **not library bugs** unless dependencies are properly installed.

**Liora-lib** is a high-performance Node.js native addon providing multimedia and system-level utilities.
It exposes modules for media conversion, sticker encoding, EXIF metadata handling, and optimized HTTP fetching — all implemented in C++ with an ES module interface.

---

**Made with ❤️ for high-performance Node.js applications**  
[⭐ Star on GitHub](https://github.com/naruyaizumi/liora-lib) | [🐛 Report Bug](https://github.com/naruyaizumi/liora-lib/issues)

---

## Features

- **Native performance** for media and network tasks
- **Prebuilt binaries** for Linux (x64)
- **Automatic fallback to local build** if no prebuild exists
- **FFmpeg-based converter** with audio/video support
- **Sticker toolkit** with WebP encoder and EXIF metadata support
- **Native fetch()** implementation using a high-speed HTTP backend

## Recommended Environment

- **Operating System:** Ubuntu 24.04 LTS or Debian 12
- **Node.js Version:** 22 or later
- **Compiler Toolchain:** GCC / Clang with build-essential and Python 3
- **Runtime:** Full ES Module support

## Modules Overview

| Module    | Description                                                |
| --------- | ---------------------------------------------------------- |
| `convert` | High-performance media converter using FFmpeg backend      |
| `sticker` | WebP encoder and EXIF injector for sticker creation        |
| `fetch`   | Native HTTP client with low-level performance optimization |

## Installation

```bash
pnpm add liora-lib
# or
yarn add liora-lib
# or
npm install liora-lib
```

---

## Usage Example

The following examples show how to use **Liora-lib** for real-world use cases — including media conversion, sticker creation, and optimized HTTP fetching.
All functions are available as ES modules and compatible with Node.js 22+.

```typescript
import { addExif, sticker, convert, fetch } from "liora-lib";
import fs from "fs";
```

### Example 1: Create a WebP sticker from an image

```typescript
const inputImage = fs.readFileSync("./example.png");
const webpBuffer = sticker(inputImage, {
    crop: false, // whether to crop or keep full frame
    quality: 90, // 0–100 compression quality
    fps: 15, // for animated sources (if any)
    packName: "Liora Pack", // sticker pack name
    authorName: "Izumi", // author/creator name
    emojis: ["🌸", "🍥"], // emojis associated with the sticker
});

// Save the sticker to file
fs.writeFileSync("./output.webp", webpBuffer);
console.log("🖼️ Sticker saved as output.webp");
```

### Example 2: Inject EXIF metadata into the WebP sticker

```typescript
const withExif = addExif(webpBuffer, {
    packName: "Liora Collection",
    authorName: "Naruya Izumi",
    emojis: ["🎨", "✨"],
});
fs.writeFileSync("./sticker_with_exif.webp", withExif);
console.log("🧩 Sticker with EXIF metadata saved.");
```

### Example 3: Convert an audio file between formats

```typescript
const inputAudio = fs.readFileSync("./sample.mp3");
const converted = convert(inputAudio, {
    format: "opus", // output format: opus, mp3, wav, etc.
    bitrate: "128k",
    channels: 2,
    sampleRate: 48000,
    ptt: true, // make it WhatsApp-compatible voice note
});
fs.writeFileSync("./sample_converted.opus", converted);
console.log("🎵 Converted audio saved as sample_converted.opus");
```

### Example 4: Fetch remote data using native C++ backend

```typescript
try {
    const response = await fetch("https://api.github.com/repos/naruyaizumi/liora-lib");
    console.log("🌐 Status:", response.status);
    console.log("📦 Content-Type:", response.headers?.["content-type"]);
    const body = await response.text();
    console.log("🧾 Body:", body.slice(0, 200) + "..."); // preview
} catch (error) {
    console.error("❌ Fetch failed:", error.message);
}
```

### Example 5: Fetch and parse JSON directly

```typescript
try {
    const api = await fetch("https://api.github.com");
    const json = await api.json();
    console.log("🔍 JSON keys:", Object.keys(json));
} catch (error) {
    console.error("❌ Failed to parse JSON:", error.message);
}
```

---

## API Reference

### `addExif(buffer, meta?)`

Injects EXIF metadata into a WebP buffer.

**Parameters:**

| Parameter | Type     | Description                     |
| --------- | -------- | ------------------------------- |
| `buffer`  | `Buffer` | WebP image buffer               |
| `meta`    | `Object` | Optional metadata configuration |

**Metadata Options:**

| Option       | Type       | Default | Description            |
| ------------ | ---------- | ------- | ---------------------- |
| `packName`   | `string`   | `""`    | Sticker pack name      |
| `authorName` | `string`   | `""`    | Author/creator name    |
| `emojis`     | `string[]` | `[]`    | Array of emoji strings |

**Returns:** `Buffer` - New WebP buffer with embedded EXIF metadata

**Example:**

```typescript
const withExif = addExif(webpBuffer, {
    packName: "My Pack",
    authorName: "John Doe",
    emojis: ["😀", "🎉"],
});
```

---

### `sticker(buffer, options?)`

Converts images or videos into WebP stickers with optional metadata.

**Parameters:**

| Parameter | Type     | Description                  |
| --------- | -------- | ---------------------------- |
| `buffer`  | `Buffer` | Input image or video buffer  |
| `options` | `Object` | Optional conversion settings |

**Options:**

| Option        | Type       | Default | Description                      |
| ------------- | ---------- | ------- | -------------------------------- |
| `crop`        | `boolean`  | `false` | Crop to square aspect ratio      |
| `quality`     | `number`   | `80`    | Image quality (1-100)            |
| `fps`         | `number`   | `15`    | Frame rate for animated stickers |
| `maxDuration` | `number`   | `15`    | Max seconds for video sticker    |
| `packName`    | `string`   | `""`    | Sticker pack name                |
| `authorName`  | `string`   | `""`    | Author/creator name              |
| `emojis`      | `string[]` | `[]`    | Array of emojis                  |

**Returns:** `Buffer` - WebP sticker with optional EXIF metadata

**Example:**

```typescript
const stickerBuffer = sticker(inputImage, {
    crop: true,
    quality: 95,
    packName: "Fun Stickers",
    authorName: "Jane",
    emojis: ["🌟"],
});
```

---

### `convert(input, options?)`

Converts audio/video files using native FFmpeg binding.

**Parameters:**

| Parameter | Type     | Description                  |
| --------- | -------- | ---------------------------- |
| `input`   | `Buffer` | Input audio/video buffer     |
| `options` | `Object` | Optional conversion settings |

**Options:**

| Option       | Type      | Default  | Description                          |
| ------------ | --------- | -------- | ------------------------------------ |
| `format`     | `string`  | `"opus"` | Output format (opus, mp3, wav, etc.) |
| `bitrate`    | `string`  | `"64k"`  | Audio bitrate                        |
| `channels`   | `number`  | `2`      | Number of audio channels             |
| `sampleRate` | `number`  | `48000`  | Sampling rate in Hz                  |
| `ptt`        | `boolean` | `false`  | Push-to-talk compatibility mode      |
| `vbr`        | `boolean` | `true`   | Variable bitrate encoding            |

**Returns:** `Buffer` - Converted media buffer

**Example:**

```typescript
const opus = convert(mp3Buffer, {
    format: "opus",
    bitrate: "96k",
    ptt: true,
});
```

---

### `fetch(url, options?)`

Performs a native HTTP request with a standard Fetch API-compatible interface.

**Parameters:**

| Parameter | Type     | Description              |
| --------- | -------- | ------------------------ |
| `url`     | `string` | Target URL               |
| `options` | `Object` | Optional request options |

**Request Options:**

| Option    | Type     | Default | Description                     |
| --------- | -------- | ------- | ------------------------------- |
| `method`  | `string` | `"GET"` | HTTP method                     |
| `headers` | `Object` | `{}`    | Request headers                 |
| `body`    | `any`    | `null`  | Request body                    |
| `timeout` | `number` | `30000` | Request timeout in milliseconds |

**Returns:** `Promise<Response>` - Response object with the following properties and methods:

**Response Properties:**

| Property  | Type      | Description            |
| --------- | --------- | ---------------------- |
| `status`  | `number`  | HTTP status code       |
| `headers` | `Object`  | Response headers       |
| `ok`      | `boolean` | True if status 200-299 |

**Response Methods:**

| Method           | Returns           | Description            |
| ---------------- | ----------------- | ---------------------- |
| `.arrayBuffer()` | `Promise<Buffer>` | Get response as Buffer |
| `.text()`        | `Promise<string>` | Get response as text   |
| `.json()`        | `Promise<any>`    | Parse response as JSON |
| `.abort()`       | `void`            | Abort the request      |

**Example:**

```typescript
const response = await fetch("https://api.example.com/data", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ key: "value" }),
});

if (response.ok) {
    const data = await response.json();
    console.log(data);
}
```

---

## Error Handling

All functions may throw errors in the following scenarios:

- **Invalid input format**: When the provided buffer is corrupted or unsupported
- **Missing dependencies**: When FFmpeg or other native dependencies are not installed
- **Network errors**: When fetch() encounters connection issues
- **Memory errors**: When processing very large files

**Example:**

```typescript
try {
    const result = sticker(inputBuffer, options);
    fs.writeFileSync("output.webp", result);
} catch (error) {
    console.error("Sticker creation failed:", error.message);
    // Handle error appropriately
}
```

---

## System Requirements

### Required Dependencies (Ubuntu/Debian)

```bash
sudo apt-get update
sudo apt-get install -y \
  build-essential \
  python3 \
  ffmpeg \
  libavcodec-dev \
  libavformat-dev \
  libavutil-dev \
  libswscale-dev \
  libwebp-dev
```

### Verify Installation

```bash
node -e "import('liora-lib').then(lib => console.log('✅ liora-lib loaded successfully'))"
```

---

## Troubleshooting

### Build Failures

- Ensure all system dependencies are installed
- Verify Node.js version is 22 or higher
- Check that you're running on a supported platform (Linux x64)

### Runtime Errors

- Verify input buffers are valid and not corrupted
- Check file format compatibility
- Ensure sufficient system memory for large media files

### Network Issues

- Verify internet connectivity for fetch() operations
- Check firewall settings if requests timeout
- Consider increasing timeout values for slow connections

---

## Performance Tips

1. **Reuse buffers** when possible to reduce memory allocation
2. **Use appropriate quality settings** - higher quality = larger files
3. **Enable VBR** for better compression in audio conversion
4. **Crop images** before processing to reduce computation time
5. **Set reasonable timeouts** for fetch() to avoid hanging requests

---

## License

Licensed under the **Apache-2.0 License**.
© 2025 Naruya Izumi
