import path from "path";
import { fileURLToPath } from "url";
import { existsSync } from "fs";
import { WorkerPool } from "./worker-pool.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "../..");

const WORKER_MODE = process.env.ADDON_WORKER_MODE || "threadpool"; // sync | async | threadpool
const POOL_SIZE = parseInt(process.env.ADDON_POOL_SIZE) || 8;

let stickerAddon = null;
let converterAddon = null;
let stickerAsyncAddon = null;
let converterAsyncAddon = null;
let stickerWorkerPool = null;
let converterWorkerPool = null;

function loadAddon(name) {
    const searchPaths = [
        path.join(projectRoot, "build", "Release", `${name}.node`),
        path.join(projectRoot, "build", "Debug", `${name}.node`),
    ];

    for (const addonPath of searchPaths) {
        if (existsSync(addonPath)) {
            try {
                return require(addonPath);
            } catch (err) {
                console.error(`[${name}] Failed to load ${addonPath}:`, err.message);
                continue;
            }
        }
    }

    throw new Error(
        `Native addon "${name}.node" not found. Build it first: node-gyp configure build`
    );
}

function getStickerAddon() {
    if (!stickerAddon) stickerAddon = loadAddon("sticker");
    return stickerAddon;
}

function getConverterAddon() {
    if (!converterAddon) converterAddon = loadAddon("converter");
    return converterAddon;
}

function getStickerAsyncAddon() {
    if (!stickerAsyncAddon) stickerAsyncAddon = loadAddon("sticker_async");
    return stickerAsyncAddon;
}

function getConverterAsyncAddon() {
    if (!converterAsyncAddon) converterAsyncAddon = loadAddon("converter_async");
    return converterAsyncAddon;
}

function getStickerWorkerPool() {
    if (!stickerWorkerPool) {
        stickerWorkerPool = new WorkerPool(
            path.join(__dirname, "workers", "sticker-worker.js"),
            POOL_SIZE
        );
    }
    return stickerWorkerPool;
}

function getConverterWorkerPool() {
    if (!converterWorkerPool) {
        converterWorkerPool = new WorkerPool(
            path.join(__dirname, "workers", "converter-worker.js"),
            POOL_SIZE
        );
    }
    return converterWorkerPool;
}

function isWebP(buf) {
    if (!Buffer.isBuffer(buf) || buf.length < 12) return false;
    return (
        buf[0] === 0x52 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x46 &&
        buf[8] === 0x57 && buf[9] === 0x45 && buf[10] === 0x42 && buf[11] === 0x50
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
            ? options.emojis.filter(e => typeof e === "string") 
            : [],
    };
}

function normalizeConverterOptions(options = {}) {
    const validFormats = ["opus", "mp3", "aac", "m4a", "ogg", "wav"];
    const format = String(options.format || "opus").toLowerCase();
    
    if (!validFormats.includes(format)) {
        throw new Error(
            `Invalid format "${format}". Valid formats: ${validFormats.join(", ")}`
        );
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

// ==================== STICKER API ====================

/**
 * Create WhatsApp sticker (async)
 * @param {Buffer} buffer - Input buffer
 * @param {Object} options - Processing options
 * @returns {Promise<Buffer>} WebP sticker
 */
export async function sticker(buffer, options = {}) {
    validateBuffer(buffer, "sticker()");
    const opts = normalizeStickerOptions(options);

    try {
        switch (WORKER_MODE) {
            case "sync": {
                const addon = getStickerAddon();
                return addon.sticker(buffer, opts);
            }

            case "async": {
                const pool = getStickerWorkerPool();
                return await pool.execute({ buffer, options: opts });
            }

            case "threadpool": {
                const addon = getStickerAsyncAddon();
                if (addon.stickerThreadPool) {
                    return await addon.stickerThreadPool(buffer, opts);
                }
                if (addon.stickerAsync) {
                    return await addon.stickerAsync(buffer, opts);
                }
                return getStickerAddon().sticker(buffer, opts);
            }

            default:
                throw new Error(`Unknown worker mode: ${WORKER_MODE}`);
        }
    } catch (err) {
        throw new Error(`sticker() failed: ${err.message}`);
    }
}

/**
 * Add EXIF metadata to WebP (always sync, fast operation)
 * @param {Buffer} buffer - WebP buffer
 * @param {Object} meta - Metadata
 * @returns {Buffer} WebP with EXIF
 */
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

/**
 * Encode RGBA to WebP (sync, usually fast)
 * @param {Buffer} buf - RGBA data
 * @param {number} width - Width
 * @param {number} height - Height
 * @param {Object} options - Options
 * @returns {Buffer} WebP
 */
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
            `encodeRGBA() buffer too small. Expected ${expectedSize} bytes, got ${buf.length}`
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

// ==================== CONVERTER API ====================

/**
 * Convert audio (async)
 * @param {Buffer} input - Input audio
 * @param {Object} options - Conversion options
 * @returns {Promise<Buffer>} Converted audio
 */
export async function convert(input, options = {}) {
    const buf = Buffer.isBuffer(input) ? input : input?.data;
    validateBuffer(buf, "convert()");
    
    const opts = normalizeConverterOptions(options);

    try {
        switch (WORKER_MODE) {
            case "sync": {
                const addon = getConverterAddon();
                return addon.convert(buf, opts);
            }

            case "async": {
                const pool = getConverterWorkerPool();
                return await pool.execute({ buffer: buf, options: opts });
            }

            case "threadpool": {
                const addon = getConverterAsyncAddon();
                if (addon.convertThreadPool) {
                    return await addon.convertThreadPool(buf, opts);
                }
                if (addon.convertAsync) {
                    return await addon.convertAsync(buf, opts);
                }
                return getConverterAddon().convert(buf, opts);
            }

            default:
                throw new Error(`Unknown worker mode: ${WORKER_MODE}`);
        }
    } catch (err) {
        throw new Error(`convert() failed: ${err.message}`);
    }
}

// ==================== SYNC FALLBACKS ====================

export function stickerSync(buffer, options = {}) {
    validateBuffer(buffer, "stickerSync()");
    const opts = normalizeStickerOptions(options);
    const addon = getStickerAddon();
    
    try {
        return addon.sticker(buffer, opts);
    } catch (err) {
        throw new Error(`stickerSync() failed: ${err.message}`);
    }
}

export function convertSync(input, options = {}) {
    const buf = Buffer.isBuffer(input) ? input : input?.data;
    validateBuffer(buf, "convertSync()");
    
    const opts = normalizeConverterOptions(options);
    const addon = getConverterAddon();
    
    try {
        return addon.convert(buf, opts);
    } catch (err) {
        throw new Error(`convertSync() failed: ${err.message}`);
    }
}

// ==================== POOL STATS ====================

/**
 * Get worker pool statistics
 * @returns {Object} Pool stats
 */
export function getPoolStats() {
    const stats = {
        mode: WORKER_MODE,
        poolSize: POOL_SIZE,
    };

    if (WORKER_MODE === "async") {
        if (stickerWorkerPool) {
            stats.sticker = stickerWorkerPool.getStats();
        }
        if (converterWorkerPool) {
            stats.converter = converterWorkerPool.getStats();
        }
    } else if (WORKER_MODE === "threadpool") {
        if (stickerAsyncAddon?.getPoolInfo) {
            stats.sticker = stickerAsyncAddon.getPoolInfo();
        }
        if (converterAsyncAddon?.getPoolInfo) {
            stats.converter = converterAsyncAddon.getPoolInfo();
        }
    }

    return stats;
}

/**
 * Cleanup and shutdown all workers
 * @returns {Promise<void>}
 */
export async function cleanup() {
    const promises = [];
    
    if (stickerWorkerPool) {
        promises.push(stickerWorkerPool.terminate());
        stickerWorkerPool = null;
    }
    
    if (converterWorkerPool) {
        promises.push(converterWorkerPool.terminate());
        converterWorkerPool = null;
    }

    await Promise.all(promises);
}

if (process.env.NODE_ENV !== "test") {
    process.on("exit", () => {
        if (stickerWorkerPool) stickerWorkerPool.terminate();
        if (converterWorkerPool) converterWorkerPool.terminate();
    });

    process.on("SIGINT", async () => {
        await cleanup();
        process.exit(0);
    });

    process.on("SIGTERM", async () => {
        await cleanup();
        process.exit(0);
    });
}

export { isWebP as isWebPFormat };
export { addExif as addExifSync };