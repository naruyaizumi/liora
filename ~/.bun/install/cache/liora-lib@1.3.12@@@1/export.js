import path from "path";
import { fileURLToPath } from "url";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = __dirname;
function universalRequire(modulePath) {
    const { createRequire } = require("module");
    const requireFn = createRequire(import.meta.url);
    return requireFn(modulePath);
}
class AddonLoader {
    _addon = null;
    _name;
    constructor(name) {
        this._name = name;
    }
    get addon() {
        if (this._addon === null) {
            const releasePath = path.join(projectRoot, `./build/Release/${this._name}.node`);
            const debugPath = path.join(projectRoot, `./build/Debug/${this._name}.node`);
            try {
                this._addon = universalRequire(releasePath);
            } catch (e1) {
                // ignore
                try {
                    this._addon = universalRequire(debugPath);
                } catch (e2) {
                    // ignore
                    throw new Error(`${this._name} Native addon is not built.`);
                }
            }
        }
        return this._addon;
    }
}
const stickerLoader = new AddonLoader("sticker");
const converterLoader = new AddonLoader("converter");
const fetchLoader = new AddonLoader("fetch");
const textDecoder = new TextDecoder("utf-8");
function isWebP(buf) {
    return (
        Buffer.isBuffer(buf) &&
        buf.length >= 12 &&
        buf.slice(0, 4).toString() === "RIFF" &&
        buf.slice(8, 12).toString() === "WEBP"
    );
}
function addExif(buffer, meta = {}) {
    if (!Buffer.isBuffer(buffer)) throw new Error("addExif() input must be a Buffer");
    return stickerLoader.addon.addExif(buffer, meta);
}
function sticker(buffer, options = {}) {
    if (!Buffer.isBuffer(buffer)) throw new Error("sticker() input must be a Buffer");
    const opts = {
        crop: options.crop ?? false,
        quality: options.quality ?? 80,
        fps: options.fps ?? 15,
        maxDuration: options.maxDuration ?? 15,
        packName: options.packName || "",
        authorName: options.authorName || "",
        emojis: options.emojis || [],
    };
    if (isWebP(buffer)) return stickerLoader.addon.addExif(buffer, opts);
    return stickerLoader.addon.sticker(buffer, opts);
}
function convert(input, options = {}) {
    const buf = Buffer.isBuffer(input) ? input : input?.data;
    if (!Buffer.isBuffer(buf)) throw new Error("convert() input must be a Buffer");
    return converterLoader.addon.convert(buf, {
        format: options.format || "opus",
        bitrate: options.bitrate || "64k",
        channels: options.channels ?? 2,
        sampleRate: options.sampleRate || 48000,
        ptt: !!options.ptt,
        vbr: options.vbr !== false,
    });
}
function fetch(url, options = {}) {
    if (typeof url !== "string") throw new TypeError("fetch() requires a URL string");
    const fetchNative = fetchLoader.addon;
    if (!fetchNative) throw new Error("Native fetch addon not loaded");
    const nativeFunc = fetchNative.startFetch || fetchNative.fetch;
    if (typeof nativeFunc !== "function") throw new Error("No valid native fetch entrypoint");
    const exec =
        typeof fetchNative.startFetch === "function"
            ? fetchNative.startFetch(url, options)
            : {
                  promise: nativeFunc(url, options),
                  abort: undefined,
              };
    const promise = exec.promise;
    return promise
        .then((res) => {
            if (!res || typeof res !== "object") {
                throw new Error("Invalid response from native fetch");
            }
            let body;
            if (Buffer.isBuffer(res.body)) {
                body = res.body;
            } else if (res.body instanceof ArrayBuffer) {
                body = Buffer.from(res.body);
            } else if (ArrayBuffer.isView(res.body)) {
                body = Buffer.from(res.body.buffer, res.body.byteOffset, res.body.byteLength);
            } else if (Array.isArray(res.body)) {
                body = Buffer.from(res.body);
            } else {
                body = Buffer.from([]);
            }
            const cachedTextRef = { val: null };
            const out = {
                status: res.status,
                statusText: res.statusText || "",
                headers: res.headers || {},
                url: res.url || url,
                ok: res.status >= 200 && res.status < 300,
                body: body,
                abort: exec.abort || (() => {}),
                arrayBuffer() {
                    return Promise.resolve(
                        body.buffer.slice(body.byteOffset, body.byteOffset + body.byteLength)
                    );
                },
                buffer() {
                    return Promise.resolve(body);
                },
                text() {
                    if (cachedTextRef.val === null) {
                        cachedTextRef.val = textDecoder.decode(body);
                    }
                    return Promise.resolve(cachedTextRef.val);
                },
                json() {
                    return new Promise((resolve, reject) => {
                        try {
                            if (cachedTextRef.val === null) {
                                cachedTextRef.val = textDecoder.decode(body);
                            }
                            resolve(JSON.parse(cachedTextRef.val));
                        } catch (e) {
                            reject(
                                new Error(
                                    `Invalid JSON: ${e instanceof Error ? e.message : String(e)}`
                                )
                            );
                        }
                    });
                },
            };
            return out;
        })
        .catch((err) => {
            const msg = err instanceof Error ? err.message : String(err);
            throw new Error(msg);
        });
}
export { addExif, sticker, convert, fetch };
