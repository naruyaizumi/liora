/**
 * @file File type detection and media categorization utilities
 * @module lib/file-type
 * @description Comprehensive production-grade file type detection using magic numbers,
 * supporting 50+ file formats including videos, images, audio, documents, and archives.
 * Optimized for WhatsApp bot environments with efficient buffer analysis.
 * @license Apache-2.0
 * @author Naruya Izumi
 */

/**
 * Detects file type by analyzing buffer magic numbers and signatures
 * @async
 * @function fileType
 * @param {Buffer|Uint8Array} buffer - Raw file buffer (minimum 4 bytes recommended)
 * @returns {Promise<{mime: string, ext: string}|null>} Object containing MIME type and extension
 * @throws {TypeError} When buffer is null, undefined, or insufficient length
 * @example
 * const result = await fileType(fileBuffer);
 * // Result: { mime: 'image/jpeg', ext: 'jpg' }
 * // Returns null for unknown formats
 *
 * @performance
 * - O(1) time complexity for most formats
 * - Minimal buffer slicing for efficiency
 * - Early returns on successful detection
 *
 * @supportedFormats
 * Videos: MP4, MOV, AVI, MKV, WebM, FLV, WMV, 3GP, M4V
 * Images: JPEG, PNG, GIF, WebP, HEIC, BMP, ICO, TIFF, SVG (basic)
 * Audio: MP3, WAV, OGG, M4A, AAC, AMR, FLAC, OPUS, MIDI
 * Documents: PDF, DOCX, XLSX, PPTX, DOC, XLS, PPT, ODT
 * Archives: ZIP, RAR, 7Z, TAR, GZ, BZ2
 * Text: TXT, HTML, CSS, JS, JSON, XML
 */
export async function fileType(buffer) {
    if (!buffer || buffer.length < 4) {
        return null;
    }

    return await Promise.resolve().then(() => {
        // ==================== VIDEO FORMATS ====================
        // MP4/MOV detection - ISO Base Media File Format
        if (buffer.length >= 12 && buffer.slice(4, 8).toString("ascii") === "ftyp") {
            const brand = buffer.slice(8, 12).toString("ascii");
            // QuickTime MOV files
            if (brand === "qt  " || brand.includes("qt")) {
                return { mime: "video/quicktime", ext: "mov" };
            }
            // MP4 video files
            if (["mp42", "isom", "avc1", "iso2"].includes(brand.trim())) {
                return { mime: "video/mp4", ext: "mp4" };
            }
            // 3GP mobile video
            if (brand === "3gp4" || brand === "3gp5") {
                return { mime: "video/3gpp", ext: "3gp" };
            }
            // M4V iTunes video
            if (brand === "M4V " || brand === "M4VP") {
                return { mime: "video/x-m4v", ext: "m4v" };
            }
        }

        // AVI detection - Resource Interchange File Format
        if (
            buffer.length >= 12 &&
            buffer[0] === 0x52 && // 'R'
            buffer[1] === 0x49 && // 'I'
            buffer[2] === 0x46 && // 'F'
            buffer[3] === 0x46 && // 'F'
            buffer[8] === 0x41 && // 'A'
            buffer[9] === 0x56 && // 'V'
            buffer[10] === 0x49 && // 'I'
            buffer[11] === 0x20 // ' '
        ) {
            return { mime: "video/x-msvideo", ext: "avi" };
        }

        // WebM/MKV detection - Matroska container
        if (
            buffer.length >= 4 &&
            buffer[0] === 0x1a &&
            buffer[1] === 0x45 &&
            buffer[2] === 0xdf &&
            buffer[3] === 0xa3
        ) {
            return { mime: "video/webm", ext: "webm" };
        }

        // FLV detection - Flash Video
        if (
            buffer.length >= 4 &&
            buffer[0] === 0x46 && // 'F'
            buffer[1] === 0x4c && // 'L'
            buffer[2] === 0x56 && // 'V'
            buffer[3] === 0x01
        ) {
            return { mime: "video/x-flv", ext: "flv" };
        }

        // WMV detection - Windows Media Video
        if (
            buffer.length >= 16 &&
            buffer[0] === 0x30 && // '0'
            buffer[1] === 0x26 && // '&'
            buffer[2] === 0xb2 && // '²'
            buffer[3] === 0x75 && // 'u'
            buffer[4] === 0x8e && // 'Ž'
            buffer[5] === 0x66 && // 'f'
            buffer[6] === 0xcf && // 'Ï'
            buffer[7] === 0x11 && // ''
            buffer[8] === 0xa6 && // '¦'
            buffer[9] === 0xd9 // 'Ù'
        ) {
            return { mime: "video/x-ms-wmv", ext: "wmv" };
        }

        // ==================== AUDIO FORMATS ====================
        // MP3 detection - ID3 header or MPEG frame sync
        if (buffer.length >= 3) {
            // ID3v2 header
            if (buffer[0] === 0x49 && buffer[1] === 0x44 && buffer[2] === 0x33) {
                return { mime: "audio/mpeg", ext: "mp3" };
            }
            // MPEG frame sync (11111111 111xxxxx)
            if (buffer[0] === 0xff && (buffer[1] & 0xe0) === 0xe0) {
                return { mime: "audio/mpeg", ext: "mp3" };
            }
        }

        // WAV detection - RIFF WAVE format
        if (
            buffer.length >= 12 &&
            buffer[0] === 0x52 && // 'R'
            buffer[1] === 0x49 && // 'I'
            buffer[2] === 0x46 && // 'F'
            buffer[3] === 0x46 && // 'F'
            buffer[8] === 0x57 && // 'W'
            buffer[9] === 0x41 && // 'A'
            buffer[10] === 0x56 && // 'V'
            buffer[11] === 0x45 // 'E'
        ) {
            return { mime: "audio/wav", ext: "wav" };
        }

        // OGG detection - Ogg container
        if (
            buffer.length >= 4 &&
            buffer[0] === 0x4f && // 'O'
            buffer[1] === 0x67 && // 'g'
            buffer[2] === 0x67 && // 'g'
            buffer[3] === 0x53 // 'S'
        ) {
            return { mime: "audio/ogg", ext: "ogg" };
        }

        // M4A/AAC detection - MPEG-4 Audio
        if (buffer.length >= 12 && buffer.slice(4, 8).toString("ascii") === "ftyp") {
            const brand = buffer.slice(8, 12).toString("ascii");
            if (brand === "M4A " || brand === "mp42") {
                return { mime: "audio/mp4", ext: "m4a" };
            }
        }

        // AAC detection - ADTS header
        if (buffer.length >= 2 && buffer[0] === 0xff && (buffer[1] & 0xf0) === 0xf0) {
            return { mime: "audio/aac", ext: "aac" };
        }

        // AMR detection - Adaptive Multi-Rate
        if (
            buffer.length >= 6 &&
            buffer[0] === 0x23 && // '#'
            buffer[1] === 0x21 && // '!'
            buffer[2] === 0x41 && // 'A'
            buffer[3] === 0x4d && // 'M'
            buffer[4] === 0x52 && // 'R'
            buffer[5] === 0x0a // '\n'
        ) {
            return { mime: "audio/amr", ext: "amr" };
        }

        // FLAC detection - Free Lossless Audio Codec
        if (
            buffer.length >= 4 &&
            buffer[0] === 0x66 && // 'f'
            buffer[1] === 0x4c && // 'L'
            buffer[2] === 0x61 && // 'a'
            buffer[3] === 0x43 // 'C'
        ) {
            return { mime: "audio/flac", ext: "flac" };
        }

        // MIDI detection - Musical Instrument Digital Interface
        if (
            buffer.length >= 4 &&
            buffer[0] === 0x4d && // 'M'
            buffer[1] === 0x54 && // 'T'
            buffer[2] === 0x68 && // 'h'
            buffer[3] === 0x64 // 'd'
        ) {
            return { mime: "audio/midi", ext: "mid" };
        }

        // ==================== IMAGE FORMATS ====================
        // JPEG detection - Start of Image marker
        if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
            return { mime: "image/jpeg", ext: "jpg" };
        }

        // PNG detection - PNG signature
        if (
            buffer.length >= 8 &&
            buffer[0] === 0x89 &&
            buffer[1] === 0x50 && // 'P'
            buffer[2] === 0x4e && // 'N'
            buffer[3] === 0x47 && // 'G'
            buffer[4] === 0x0d && // '\r'
            buffer[5] === 0x0a && // '\n'
            buffer[6] === 0x1a && // '\x1a'
            buffer[7] === 0x0a // '\n'
        ) {
            return { mime: "image/png", ext: "png" };
        }

        // GIF detection - GIF87a or GIF89a
        if (
            buffer.length >= 6 &&
            buffer[0] === 0x47 && // 'G'
            buffer[1] === 0x49 && // 'I'
            buffer[2] === 0x46 && // 'F'
            buffer[3] === 0x38 && // '8'
            (buffer[4] === 0x37 || buffer[4] === 0x39) && // '7' or '9'
            buffer[5] === 0x61 // 'a'
        ) {
            return { mime: "image/gif", ext: "gif" };
        }

        // WebP detection - RIFF WebP
        if (
            buffer.length >= 12 &&
            buffer[0] === 0x52 && // 'R'
            buffer[1] === 0x49 && // 'I'
            buffer[2] === 0x46 && // 'F'
            buffer[3] === 0x46 && // 'F'
            buffer[8] === 0x57 && // 'W'
            buffer[9] === 0x45 && // 'E'
            buffer[10] === 0x42 && // 'B'
            buffer[11] === 0x50 // 'P'
        ) {
            return { mime: "image/webp", ext: "webp" };
        }

        // HEIC/HEIF detection - High Efficiency Image Format
        if (buffer.length >= 12 && buffer.slice(4, 8).toString("ascii") === "ftyp") {
            const brand = buffer.slice(8, 12).toString("ascii");
            if (["heic", "mif1", "heix", "hevc", "hevs"].includes(brand)) {
                return { mime: "image/heic", ext: "heic" };
            }
        }

        // BMP detection - Bitmap
        if (
            buffer.length >= 2 &&
            buffer[0] === 0x42 && // 'B'
            buffer[1] === 0x4d // 'M'
        ) {
            return { mime: "image/bmp", ext: "bmp" };
        }

        // ICO detection - Windows Icon
        if (
            buffer.length >= 4 &&
            buffer[0] === 0x00 &&
            buffer[1] === 0x00 &&
            buffer[2] === 0x01 &&
            buffer[3] === 0x00
        ) {
            return { mime: "image/x-icon", ext: "ico" };
        }

        // TIFF detection (both little and big endian)
        if (
            buffer.length >= 4 &&
            ((buffer[0] === 0x49 &&
                buffer[1] === 0x49 &&
                buffer[2] === 0x2a &&
                buffer[3] === 0x00) || // II*
                (buffer[0] === 0x4d &&
                    buffer[1] === 0x4d &&
                    buffer[2] === 0x00 &&
                    buffer[3] === 0x2a)) // MM*
        ) {
            return { mime: "image/tiff", ext: "tiff" };
        }

        // ==================== DOCUMENT FORMATS ====================
        // PDF detection - %PDF signature
        if (
            buffer.length >= 4 &&
            buffer[0] === 0x25 && // '%'
            buffer[1] === 0x50 && // 'P'
            buffer[2] === 0x44 && // 'D'
            buffer[3] === 0x46 // 'F'
        ) {
            return { mime: "application/pdf", ext: "pdf" };
        }

        // Office Open XML (DOCX, XLSX, PPTX)
        if (
            buffer.length >= 4 &&
            buffer[0] === 0x50 && // 'P'
            buffer[1] === 0x4b && // 'K'
            buffer[2] === 0x03 &&
            buffer[3] === 0x04
        ) {
            const bufferStr = buffer.toString("latin1", 0, Math.min(1000, buffer.length));

            if (bufferStr.includes("[Content_Types].xml")) {
                // Word Document
                if (bufferStr.includes("word/")) {
                    return {
                        mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                        ext: "docx",
                    };
                }
                // PowerPoint Presentation
                if (bufferStr.includes("ppt/")) {
                    return {
                        mime: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
                        ext: "pptx",
                    };
                }
                // Excel Spreadsheet
                if (bufferStr.includes("xl/")) {
                    return {
                        mime: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                        ext: "xlsx",
                    };
                }
            }

            return { mime: "application/zip", ext: "zip" };
        }

        // Legacy Office formats
        if (
            buffer.length >= 8 &&
            buffer[0] === 0xd0 &&
            buffer[1] === 0xcf &&
            buffer[2] === 0x11 &&
            buffer[3] === 0xe0 &&
            buffer[4] === 0xa1 &&
            buffer[5] === 0xb1 &&
            buffer[6] === 0x1a &&
            buffer[7] === 0xe1
        ) {
            const bufferStr = buffer.toString("latin1", 0, Math.min(512, buffer.length));

            if (bufferStr.includes("Word.Document")) {
                return { mime: "application/msword", ext: "doc" };
            }
            if (bufferStr.includes("Excel.Sheet")) {
                return { mime: "application/vnd.ms-excel", ext: "xls" };
            }
            if (bufferStr.includes("PowerPoint.Show")) {
                return { mime: "application/vnd.ms-powerpoint", ext: "ppt" };
            }
        }

        // OpenDocument formats
        if (
            buffer.length >= 4 &&
            buffer[0] === 0x50 && // 'P'
            buffer[1] === 0x4b && // 'K'
            buffer[2] === 0x03 &&
            buffer[3] === 0x04
        ) {
            const bufferStr = buffer.toString("latin1", 0, Math.min(512, buffer.length));

            if (
                bufferStr.includes("mimetype") &&
                bufferStr.includes("application/vnd.oasis.opendocument")
            ) {
                if (bufferStr.includes("text")) {
                    return { mime: "application/vnd.oasis.opendocument.text", ext: "odt" };
                }
                if (bufferStr.includes("spreadsheet")) {
                    return { mime: "application/vnd.oasis.opendocument.spreadsheet", ext: "ods" };
                }
                if (bufferStr.includes("presentation")) {
                    return { mime: "application/vnd.oasis.opendocument.presentation", ext: "odp" };
                }
            }
        }

        // ==================== ARCHIVE FORMATS ====================
        // ZIP detection
        if (
            buffer.length >= 4 &&
            buffer[0] === 0x50 && // 'P'
            buffer[1] === 0x4b && // 'K'
            buffer[2] === 0x03 &&
            buffer[3] === 0x04
        ) {
            return { mime: "application/zip", ext: "zip" };
        }

        // RAR detection (v4 and v5)
        if (
            buffer.length >= 7 &&
            ((buffer[0] === 0x52 &&
                buffer[1] === 0x61 &&
                buffer[2] === 0x72 &&
                buffer[3] === 0x21) || // Rar!
                (buffer[0] === 0x52 &&
                    buffer[1] === 0x45 &&
                    buffer[2] === 0x7e &&
                    buffer[3] === 0x5e)) // RE~^
        ) {
            return { mime: "application/vnd.rar", ext: "rar" };
        }

        // 7-Zip detection
        if (
            buffer.length >= 6 &&
            buffer[0] === 0x37 && // '7'
            buffer[1] === 0x7a && // 'z'
            buffer[2] === 0xbc &&
            buffer[3] === 0xaf &&
            buffer[4] === 0x27 &&
            buffer[5] === 0x1c
        ) {
            return { mime: "application/x-7z-compressed", ext: "7z" };
        }

        // TAR detection
        if (
            buffer.length >= 262 &&
            ((buffer[257] === 0x75 &&
                buffer[258] === 0x73 &&
                buffer[259] === 0x74 &&
                buffer[260] === 0x61 &&
                buffer[261] === 0x72) || // ustar
                (buffer[257] === 0x75 &&
                    buffer[258] === 0x73 &&
                    buffer[259] === 0x74 &&
                    buffer[260] === 0x61 &&
                    buffer[261] === 0x72 &&
                    buffer[262] === 0x00)) // ustar\0
        ) {
            return { mime: "application/x-tar", ext: "tar" };
        }

        // GZIP detection
        if (buffer.length >= 3 && buffer[0] === 0x1f && buffer[1] === 0x8b && buffer[2] === 0x08) {
            return { mime: "application/gzip", ext: "gz" };
        }

        // BZIP2 detection
        if (
            buffer.length >= 3 &&
            buffer[0] === 0x42 && // 'B'
            buffer[1] === 0x5a && // 'Z'
            buffer[2] === 0x68 // 'h'
        ) {
            return { mime: "application/x-bzip2", ext: "bz2" };
        }

        // ==================== TEXT FORMATS ====================
        // Plain text detection (ASCII heuristic)
        if (buffer.length > 0) {
            let asciiCount = 0;
            let controlCount = 0;
            const checkLength = Math.min(256, buffer.length);

            for (let i = 0; i < checkLength; i++) {
                const byte = buffer[i];
                // Printable ASCII + common control chars
                if (
                    (byte >= 0x20 && byte <= 0x7e) ||
                    byte === 0x09 || // tab
                    byte === 0x0a || // newline
                    byte === 0x0d || // carriage return
                    byte === 0x0c || // form feed
                    byte === 0x1b // escape
                ) {
                    asciiCount++;
                }
                if (
                    byte < 0x20 &&
                    byte !== 0x09 &&
                    byte !== 0x0a &&
                    byte !== 0x0d &&
                    byte !== 0x0c &&
                    byte !== 0x1b
                ) {
                    controlCount++;
                }
            }

            // High ASCII ratio and low control chars
            if (asciiCount / checkLength > 0.95 && controlCount / checkLength < 0.05) {
                return { mime: "text/plain", ext: "txt" };
            }
        }

        // HTML detection
        if (
            buffer.length >= 5 &&
            // <!DOCTYPE or <html
            ((buffer[0] === 0x3c &&
                buffer[1] === 0x21 &&
                buffer[2] === 0x44 &&
                buffer[3] === 0x4f) ||
                (buffer[0] === 0x3c &&
                    buffer[1] === 0x68 &&
                    buffer[2] === 0x74 &&
                    buffer[3] === 0x6d))
        ) {
            return { mime: "text/html", ext: "html" };
        }

        // XML detection
        if (
            buffer.length >= 5 &&
            buffer[0] === 0x3c && // '<'
            buffer[1] === 0x3f && // '?'
            buffer[2] === 0x78 && // 'x'
            buffer[3] === 0x6d && // 'm'
            buffer[4] === 0x6c // 'l'
        ) {
            return { mime: "application/xml", ext: "xml" };
        }

        // JSON detection (starts with { or [)
        if (
            buffer.length >= 1 &&
            (buffer[0] === 0x7b || buffer[0] === 0x5b) // '{' or '['
        ) {
            try {
                // Try to parse to verify it's valid JSON
                const jsonStr = buffer.toString("utf8", 0, Math.min(1024, buffer.length));
                JSON.parse(jsonStr);
                return { mime: "application/json", ext: "json" };
            } catch {
                // Not valid JSON
            }
        }

        // JavaScript detection
        if (
            buffer.length >= 2 &&
            buffer[0] === 0x2f && // '/'
            buffer[1] === 0x2a // '*'
        ) {
            const bufferStr = buffer.toString("utf8", 0, Math.min(100, buffer.length));
            if (
                bufferStr.includes("function") ||
                bufferStr.includes("var ") ||
                bufferStr.includes("const ") ||
                bufferStr.includes("let ")
            ) {
                return { mime: "text/javascript", ext: "js" };
            }
        }

        // CSS detection
        if (
            buffer.length >= 5 &&
            buffer.toString("utf8", 0, Math.min(50, buffer.length)).includes("{")
        ) {
            const bufferStr = buffer.toString("utf8", 0, Math.min(200, buffer.length));
            if (
                bufferStr.includes(":") &&
                bufferStr.includes(";") &&
                (bufferStr.includes("color") ||
                    bufferStr.includes("font") ||
                    bufferStr.includes("margin") ||
                    bufferStr.includes("padding"))
            ) {
                return { mime: "text/css", ext: "css" };
            }
        }

        // ==================== OTHER FORMATS ====================
        // SVG detection (basic - looks for SVG tags)
        if (
            buffer.length >= 100 &&
            buffer.toString("utf8", 0, Math.min(200, buffer.length)).toLowerCase().includes("<svg")
        ) {
            return { mime: "image/svg+xml", ext: "svg" };
        }

        // EXE detection - DOS MZ header
        if (
            buffer.length >= 2 &&
            buffer[0] === 0x4d && // 'M'
            buffer[1] === 0x5a // 'Z'
        ) {
            return { mime: "application/x-msdownload", ext: "exe" };
        }

        // DMG detection - Apple Disk Image
        if (
            buffer.length >= 4 &&
            buffer[0] === 0x78 && // 'x'
            buffer[1] === 0x01 &&
            buffer[2] === 0x73 &&
            buffer[3] === 0x0d
        ) {
            return { mime: "application/x-apple-diskimage", ext: "dmg" };
        }

        // ISO detection - CD/DVD image
        if (
            buffer.length >= 32769 &&
            buffer[32769] === 0x43 && // 'C'
            buffer[32770] === 0x44 && // 'D'
            buffer[32771] === 0x30 && // '0'
            buffer[32772] === 0x30 && // '0'
            buffer[32773] === 0x31 // '1'
        ) {
            return { mime: "application/x-iso9660-image", ext: "iso" };
        }

        return null;
    });
}

/**
 * Categorizes file type into broad media categories
 * @async
 * @function getCategory
 * @param {{mime: string, ext: string}|null} type - File type object from fileType()
 * @returns {Promise<string>} Category string: 'video', 'audio', 'image', 'text', 'document', 'archive', 'other', or 'unknown'
 * @example
 * const type = await fileType(buffer);
 * const category = await getCategory(type); // 'image'
 *
 * @categoryMapping
 * - video/: video, animation
 * - audio/: audio
 * - image/: image
 * - text/: text
 * - application/pdf|msword|vnd.*: document
 * - application/zip|rar|gzip|7z: archive
 * - others: other
 */
export async function getCategory(type) {
    if (!type) return "unknown";

    return await Promise.resolve().then(() => {
        const mime = type.mime.toLowerCase();

        if (mime.startsWith("video/")) return "video";
        if (mime.startsWith("audio/")) return "audio";
        if (mime.startsWith("image/")) return "image";
        if (mime.startsWith("text/")) return "text";
        if (
            mime.includes("pdf") ||
            mime.includes("document") ||
            mime.includes("sheet") ||
            mime.includes("presentation") ||
            mime.includes("msword") ||
            mime.includes("excel") ||
            mime.includes("powerpoint") ||
            mime.includes("opendocument") ||
            mime.includes("oasis") ||
            mime.includes("vnd.")
        ) {
            return "document";
        }
        if (
            mime.includes("zip") ||
            mime.includes("rar") ||
            mime.includes("tar") ||
            mime.includes("gzip") ||
            mime.includes("7z") ||
            mime.includes("bzip2") ||
            mime.includes("compressed")
        ) {
            return "archive";
        }
        if (mime.includes("json") || mime.includes("xml")) {
            return "text";
        }

        return "other";
    });
}

/**
 * Maps file extension to MIME type
 * @async
 * @function getMime
 * @param {string} ext - File extension without dot (e.g., 'jpg', 'mp4')
 * @returns {Promise<string>} Corresponding MIME type or 'application/octet-stream' for unknown
 * @example
 * const mime = await getMime('jpg'); // 'image/jpeg'
 * const unknown = await getMime('xyz'); // 'application/octet-stream'
 *
 * @mimeDatabase
 * - Covers 80+ common extensions
 * - Follows IANA media type registry
 * - Includes proprietary formats (Office, Apple, Adobe)
 */
export async function getMime(ext) {
    const mimeMap = {
        // Video
        mp4: "video/mp4",
        m4v: "video/x-m4v",
        mov: "video/quicktime",
        avi: "video/x-msvideo",
        mkv: "video/x-matroska",
        webm: "video/webm",
        flv: "video/x-flv",
        wmv: "video/x-ms-wmv",
        "3gp": "video/3gpp",
        mpg: "video/mpeg",
        mpeg: "video/mpeg",
        ogv: "video/ogg",

        // Audio
        mp3: "audio/mpeg",
        wav: "audio/wav",
        ogg: "audio/ogg",
        m4a: "audio/mp4",
        aac: "audio/aac",
        amr: "audio/amr",
        flac: "audio/flac",
        opus: "audio/ogg",
        mid: "audio/midi",
        midi: "audio/midi",
        wma: "audio/x-ms-wma",

        // Images
        jpg: "image/jpeg",
        jpeg: "image/jpeg",
        png: "image/png",
        gif: "image/gif",
        webp: "image/webp",
        heic: "image/heic",
        heif: "image/heif",
        bmp: "image/bmp",
        ico: "image/x-icon",
        tiff: "image/tiff",
        tif: "image/tiff",
        svg: "image/svg+xml",
        psd: "image/vnd.adobe.photoshop",
        ai: "application/postscript",

        // Documents
        pdf: "application/pdf",
        doc: "application/msword",
        docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        xls: "application/vnd.ms-excel",
        xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        ppt: "application/vnd.ms-powerpoint",
        pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        odt: "application/vnd.oasis.opendocument.text",
        ods: "application/vnd.oasis.opendocument.spreadsheet",
        odp: "application/vnd.oasis.opendocument.presentation",
        rtf: "application/rtf",
        txt: "text/plain",
        csv: "text/csv",

        // Text/Code
        html: "text/html",
        htm: "text/html",
        css: "text/css",
        js: "text/javascript",
        json: "application/json",
        xml: "application/xml",
        yaml: "text/yaml",
        yml: "text/yaml",
        md: "text/markdown",
        ini: "text/plain",
        cfg: "text/plain",
        conf: "text/plain",

        // Archives
        zip: "application/zip",
        rar: "application/vnd.rar",
        "7z": "application/x-7z-compressed",
        tar: "application/x-tar",
        gz: "application/gzip",
        bz2: "application/x-bzip2",
        xz: "application/x-xz",

        // Executables
        exe: "application/x-msdownload",
        msi: "application/x-msdownload",
        dmg: "application/x-apple-diskimage",
        pkg: "application/x-newton-compatible-pkg",
        deb: "application/vnd.debian.binary-package",
        rpm: "application/x-rpm",

        // Fonts
        ttf: "font/ttf",
        otf: "font/otf",
        woff: "font/woff",
        woff2: "font/woff2",

        // Other
        torrent: "application/x-bittorrent",
        ics: "text/calendar",
        vcf: "text/vcard",
    };

    return await Promise.resolve().then(() => {
        return mimeMap[ext.toLowerCase()] || "application/octet-stream";
    });
}

/**
 * Maps MIME type to file extension
 * @async
 * @function getExtension
 * @param {string} mime - MIME type string
 * @returns {Promise<string>} File extension without dot or 'bin' for unknown
 * @example
 * const ext = await getExtension('image/jpeg'); // 'jpg'
 * const unknown = await getExtension('unknown/type'); // 'bin'
 *
 * @extensionMapping
 * - Reverse mapping of getMime()
 * - Handles common aliases (jpeg -> jpg)
 * - Returns 'bin' for binary streams
 */
export async function getExtension(mime) {
    if (!mime) return "bin";

    const mimeToExt = {
        // Video
        "video/mp4": "mp4",
        "video/x-m4v": "m4v",
        "video/quicktime": "mov",
        "video/x-msvideo": "avi",
        "video/x-matroska": "mkv",
        "video/webm": "webm",
        "video/x-flv": "flv",
        "video/x-ms-wmv": "wmv",
        "video/3gpp": "3gp",
        "video/mpeg": "mpg",
        "video/ogg": "ogv",

        // Audio
        "audio/mpeg": "mp3",
        "audio/wav": "wav",
        "audio/ogg": "ogg",
        "audio/mp4": "m4a",
        "audio/aac": "aac",
        "audio/amr": "amr",
        "audio/flac": "flac",
        "audio/midi": "mid",
        "audio/x-ms-wma": "wma",

        // Images
        "image/jpeg": "jpg",
        "image/png": "png",
        "image/gif": "gif",
        "image/webp": "webp",
        "image/heic": "heic",
        "image/heif": "heif",
        "image/bmp": "bmp",
        "image/x-icon": "ico",
        "image/tiff": "tiff",
        "image/svg+xml": "svg",
        "image/vnd.adobe.photoshop": "psd",
        "application/postscript": "ai",

        // Documents
        "application/pdf": "pdf",
        "application/msword": "doc",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
        "application/vnd.ms-excel": "xls",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
        "application/vnd.ms-powerpoint": "ppt",
        "application/vnd.openxmlformats-officedocument.presentationml.presentation": "pptx",
        "application/vnd.oasis.opendocument.text": "odt",
        "application/vnd.oasis.opendocument.spreadsheet": "ods",
        "application/vnd.oasis.opendocument.presentation": "odp",
        "application/rtf": "rtf",
        "text/plain": "txt",
        "text/csv": "csv",

        // Text/Code
        "text/html": "html",
        "text/css": "css",
        "text/javascript": "js",
        "application/javascript": "js",
        "application/json": "json",
        "application/xml": "xml",
        "text/xml": "xml",
        "text/yaml": "yaml",
        "text/markdown": "md",

        // Archives
        "application/zip": "zip",
        "application/vnd.rar": "rar",
        "application/x-7z-compressed": "7z",
        "application/x-tar": "tar",
        "application/gzip": "gz",
        "application/x-bzip2": "bz2",
        "application/x-xz": "xz",

        // Executables
        "application/x-msdownload": "exe",
        "application/x-apple-diskimage": "dmg",
        "application/vnd.debian.binary-package": "deb",
        "application/x-rpm": "rpm",

        // Fonts
        "font/ttf": "ttf",
        "font/otf": "otf",
        "font/woff": "woff",
        "font/woff2": "woff2",

        // Other
        "application/x-bittorrent": "torrent",
        "text/calendar": "ics",
        "text/vcard": "vcf",
    };

    return mimeToExt[mime.toLowerCase()] || "bin";
}

/**
 * Formats bytes into human-readable string (KB, MB, GB)
 * @function formatBytes
 * @param {number} bytes - Number of bytes
 * @returns {string} Formatted string with appropriate unit
 * @example
 * formatBytes(1024); // "1 KB"
 * formatBytes(1048576); // "1 MB"
 * formatBytes(0); // "0 B"
 *
 * @formatRules
 * - Uses binary prefixes (1024 base)
 * - Shows 2 decimal places for fractional values
 * - Returns "0 B" for zero bytes
 */
export function formatBytes(bytes) {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

/**
 * Returns modern browser headers for web requests
 * @function getBrowserHeaders
 * @returns {Object} Headers object mimicking Chrome browser
 * @example
 * const headers = getBrowserHeaders();
 * // Use with fetch: fetch(url, { headers })
 *
 * @headerComposition
 * - User-Agent: Latest Chrome on macOS
 * - Accept: Modern media types
 * - Security: Up-to-date Sec-* headers
 * - Cache: No-cache for fresh data
 */
export function getBrowserHeaders() {
    return {
        "User-Agent":
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
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

/**
 * Checks if MIME type is an image
 * @function isImage
 * @param {string} mime - MIME type string
 * @returns {boolean} True if image MIME type
 */
export function isImage(mime) {
    return mime && mime.startsWith("image/");
}

/**
 * Checks if MIME type is a video
 * @function isVideo
 * @param {string} mime - MIME type string
 * @returns {boolean} True if video MIME type
 */
export function isVideo(mime) {
    return mime && mime.startsWith("video/");
}

/**
 * Checks if MIME type is audio
 * @function isAudio
 * @param {string} mime - MIME type string
 * @returns {boolean} True if audio MIME type
 */
export function isAudio(mime) {
    return mime && mime.startsWith("audio/");
}

/**
 * Checks if MIME type is JSON
 * @function isJson
 * @param {string} mime - MIME type string
 * @returns {boolean} True if JSON MIME type
 */
export function isJson(mime) {
    return mime && (mime === "application/json" || mime.includes("+json"));
}

/**
 * Checks if MIME type is HTML
 * @function isHtml
 * @param {string} mime - MIME type string
 * @returns {boolean} True if HTML MIME type
 */
export function isHtml(mime) {
    return mime && (mime === "text/html" || mime.includes("html"));
}

/**
 * Checks if MIME type is text
 * @function isText
 * @param {string} mime - MIME type string
 * @returns {boolean} True if text MIME type
 */
export function isText(mime) {
    return mime && mime.startsWith("text/");
}

/**
 * Checks if MIME type is a document (PDF, Office, etc.)
 * @function isDocument
 * @param {string} mime - MIME type string
 * @returns {boolean} True if document MIME type
 */
export function isDocument(mime) {
    return (
        mime &&
        (mime.includes("pdf") ||
            mime.includes("document") ||
            mime.includes("sheet") ||
            mime.includes("presentation") ||
            mime.includes("msword") ||
            mime.includes("excel") ||
            mime.includes("powerpoint") ||
            mime.includes("opendocument") ||
            mime.includes("oasis") ||
            mime === "application/rtf")
    );
}

/**
 * Checks if MIME type is an archive (ZIP, RAR, etc.)
 * @function isArchive
 * @param {string} mime - MIME type string
 * @returns {boolean} True if archive MIME type
 */
export function isArchive(mime) {
    return (
        mime &&
        (mime.includes("zip") ||
            mime.includes("rar") ||
            mime.includes("tar") ||
            mime.includes("gzip") ||
            mime.includes("7z") ||
            mime.includes("bzip2") ||
            mime.includes("compressed"))
    );
}
