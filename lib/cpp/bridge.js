import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "../..");

let stickerAddon = null;
let converterAddon = null;

function loadAddon(name) {
    const searchPaths = [
        path.join(projectRoot, "build", "Release", `${name}.node`),
        path.join(projectRoot, "build", "Debug", `${name}.node`),
    ];

    for (const addonPath of searchPaths) {
        try {
            if (fs.existsSync(addonPath)) {
                return require(addonPath);
            }
        } catch (err) {
            console.error(`[${name}] Failed to load ${addonPath}:`, err.message);
            continue;
        }
    }

    const pathList = searchPaths.map((p) => `  - ${p}`).join("\n");
    throw new Error(
        `Native addon "${name}.node" not found.\n` +
            `Searched in:\n${pathList}\n\n` +
            `Build the addon first:\n  npm run build:addon`
    );
}

function getStickerAddon() {
    if (!stickerAddon) {
        stickerAddon = loadAddon("sticker");
    }
    return stickerAddon;
}

function getConverterAddon() {
    if (!converterAddon) {
        converterAddon = loadAddon("converter");
    }
    return converterAddon;
}

function isWebP(buf) {
    if (!Buffer.isBuffer(buf) || buf.length < 12) return false;
    return (
        buf[0] === 0x52 &&
        buf[1] === 0x49 &&
        buf[2] === 0x46 &&
        buf[3] === 0x46 &&
        buf[8] === 0x57 &&
        buf[9] === 0x45 &&
        buf[10] === 0x42 &&
        buf[11] === 0x50
    );
}

function validateBuffer(buf, fnName) {
    if (!Buffer.isBuffer(buf)) {
        throw new TypeError(`${fnName} requires a Buffer, got ${typeof buf}`);
    }
    if (buf.length === 0) {
        throw new Error(`${fnName} received empty buffer`);
    }
    if (buf.length > 100 * 1024 * 1024) {
        throw new Error(`${fnName} buffer too large (max 100MB)`);
    }
}

function normalizeStickerOptions(options = {}) {
    return {
        crop: Boolean(options.crop),
        quality: Math.min(100, Math.max(1, Number(options.quality) || 80)),
        fps: Math.min(30, Math.max(1, Number(options.fps) || 15)),
        maxDuration: Math.min(60, Math.max(1, Number(options.maxDuration) || 15)),
        packName: String(options.packName || ""),
        authorName: String(options.authorName || ""),
        emojis: Array.isArray(options.emojis)
            ? options.emojis.filter((e) => typeof e === "string")
            : [],
    };
}

function normalizeConverterOptions(options = {}) {
    const validFormats = ["opus", "mp3", "aac", "m4a", "ogg", "wav"];
    const format = String(options.format || "opus").toLowerCase();

    if (!validFormats.includes(format)) {
        throw new Error(`Invalid format "${format}". Valid formats: ${validFormats.join(", ")}`);
    }

    return {
        format,
        bitrate: String(options.bitrate || "64k"),
        channels: Math.min(2, Math.max(1, Number(options.channels) || 2)),
        sampleRate: Math.min(96000, Math.max(8000, Number(options.sampleRate) || 48000)),
        ptt: Boolean(options.ptt),
        vbr: options.vbr !== false,
    };
}

export function addExif(buffer, meta = {}) {
    validateBuffer(buffer, "addExif()");

    const addon = getStickerAddon();

    try {
        return addon.addExif(buffer, {
            packName: String(meta.packName || ""),
            authorName: String(meta.authorName || ""),
            emojis: Array.isArray(meta.emojis) ? meta.emojis : [],
        });
    } catch (err) {
        throw new Error(`addExif() failed: ${err.message}`);
    }
}

export function sticker(buffer, options = {}) {
    validateBuffer(buffer, "sticker()");

    const opts = normalizeStickerOptions(options);
    const addon = getStickerAddon();

    try {
        return addon.sticker(buffer, opts);
    } catch (err) {
        throw new Error(`sticker() failed: ${err.message}`);
    }
}

export function encodeRGBA(buf, width, height, options = {}) {
    validateBuffer(buf, "encodeRGBA()");

    const w = Number(width);
    const h = Number(height);

    if (!Number.isInteger(w) || w <= 0) {
        throw new Error(`encodeRGBA() invalid width: ${width}`);
    }
    if (!Number.isInteger(h) || h <= 0) {
        throw new Error(`encodeRGBA() invalid height: ${height}`);
    }

    const expectedSize = w * h * 4;
    if (buf.length < expectedSize) {
        throw new Error(
            `encodeRGBA() buffer too small. Expected ${expectedSize} bytes for ${w}x${h} RGBA, got ${buf.length}`
        );
    }

    const addon = getStickerAddon();
    const quality = Math.min(100, Math.max(1, Number(options.quality) || 80));

    try {
        return addon.encodeRGBA(buf, w, h, { quality });
    } catch (err) {
        throw new Error(`encodeRGBA() failed: ${err.message}`);
    }
}

export function convert(input, options = {}) {
    const buf = Buffer.isBuffer(input) ? input : input?.data;
    validateBuffer(buf, "convert()");

    const opts = normalizeConverterOptions(options);
    const addon = getConverterAddon();

    try {
        return addon.convert(buf, opts);
    } catch (err) {
        throw new Error(`convert() failed: ${err.message}`);
    }
}

export function isWebPFormat(buffer) {
    return isWebP(buffer);
}

export function getAddonInfo() {
    return {
        mode: "sync",
        runtime: "node",
        sticker: {
            loaded: stickerAddon !== null,
            path: stickerAddon ? "loaded" : "not loaded",
        },
        converter: {
            loaded: converterAddon !== null,
            path: converterAddon ? "loaded" : "not loaded",
        },
    };
}

export { sticker as stickerSync };
export { convert as convertSync };
export { addExif as addExifSync };
