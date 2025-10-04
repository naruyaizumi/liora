import path from "path";
import { fileURLToPath } from "url";
import { createRequire } from "module";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);

function loadAddon(name) {
  try {
    return require(path.join(__dirname, `../build/Release/${name}.node`));
  } catch {
    try {
      return require(path.join(__dirname, `../build/Debug/${name}.node`));
    } catch {
      throw new Error(
        `${name} addon belum terbuild. Jalankan 'npm run build'.`,
      );
    }
  }
}

/* =====================
   CRON BRIDGE
   ===================== */
const cronNative = loadAddon("cron");
const jobs = new Map();

class CronJob {
  constructor(name, handle) {
    this._name = name;
    this._handle = handle;
    if (this._handle?.start) this._handle.start();
  }

  stop() {
    if (this._handle?.stop) {
      this._handle.stop();
      this._handle = null;
      jobs.delete(this._name);
    }
  }

  isRunning() {
    return this._handle?.isRunning?.() ?? false;
  }

  secondsToNext() {
    return this._handle?.secondsToNext?.() ?? -1;
  }
}

export function schedule(exprOrName, callback, options = {}) {
  if (typeof callback !== "function") {
    throw new Error("schedule() butuh callback function");
  }
  const handle = cronNative.schedule(exprOrName, callback, options);
  const job = new CronJob(exprOrName, handle);
  jobs.set(exprOrName, job);
  return job;
}

/* =====================
   STICKER BRIDGE
   ===================== */
const stickerNative = loadAddon("sticker");

function isWebP(buf) {
  return (
    Buffer.isBuffer(buf) &&
    buf.length >= 12 &&
    buf.slice(0, 4).toString() === "RIFF" &&
    buf.slice(8, 12).toString() === "WEBP"
  );
}

export function addExif(buffer, meta = {}) {
  if (!Buffer.isBuffer(buffer)) {
    throw new Error("addExif() input harus Buffer");
  }
  return stickerNative.addExif(buffer, meta);
}

export function sticker(buffer, options = {}) {
  if (!Buffer.isBuffer(buffer)) {
    throw new Error("sticker() input harus Buffer");
  }

  const opts = {
    crop: options.crop ?? false,
    quality: options.quality ?? 80,
    fps: options.fps ?? 15,
    maxDuration: options.maxDuration ?? 15,
    packName: options.packName || "",
    authorName: options.authorName || "",
    emojis: options.emojis || [],
  };

  if (isWebP(buffer)) {
    return stickerNative.addExif(buffer, opts);
  }

  return stickerNative.sticker(buffer, opts);
}

export function encodeRGBA(buf, w, h, opt = {}) {
  if (!Buffer.isBuffer(buf)) {
    throw new Error("encodeRGBA() input harus Buffer");
  }
  return stickerNative.encodeRGBA(buf, w, h, opt);
}

/* =====================
   CONVERTER BRIDGE
   ===================== */
const converterNative = loadAddon("converter");

export function convert(input, options = {}) {
  const buf = Buffer.isBuffer(input) ? input : input?.data;
  if (!Buffer.isBuffer(buf)) throw new Error("convert() input harus Buffer");

  return converterNative.convert(buf, {
    format: options.format || "opus",
    bitrate: options.bitrate || "64k",
    channels: options.channels ?? 2,
    sampleRate: options.sampleRate || 48000,
    ptt: !!options.ptt,
    vbr: options.vbr !== false,
  });
}
