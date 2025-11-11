import path from "path";
import { fileURLToPath } from "url";
import { existsSync } from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const projectRoot = path.resolve(__dirname, "../..");

function loadAddon(name) {
  const possiblePaths = [
    path.join(projectRoot, "build", "Release", `${name}.node`),
    path.join(projectRoot, "build", "Debug", `${name}.node`),
    path.join(__dirname, "../build/Release", `${name}.node`),
    path.join(__dirname, "../build/Debug", `${name}.node`),
  ];
  
  for (const addonPath of possiblePaths) {
    if (existsSync(addonPath)) {
      try {
        return require(addonPath);
      } catch (err) {
        console.error(`Failed to load ${addonPath}:`, err.message);
        continue;
      }
    }
  }
  
  throw new Error(
    `${name}.node not found. Searched in:\n${possiblePaths.map(p => `  - ${p}`).join("\n")}\n\n` +
    `Please build the native addon:\n  bun run build:addon`
  );
}

let stickerNative = null;
let converterNative = null;

function getStickerAddon() {
  if (!stickerNative) {
    stickerNative = loadAddon("sticker");
  }
  return stickerNative;
}

function getConverterAddon() {
  if (!converterNative) {
    converterNative = loadAddon("converter");
  }
  return converterNative;
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
  return true;
}

export function addExif(buffer, meta = {}) {
  validateBuffer(buffer, "addExif()");
  
  const addon = getStickerAddon();
  
  try {
    return addon.addExif(buffer, meta);
  } catch (err) {
    throw new Error(`addExif() failed: ${err.message}`);
  }
}

export function sticker(buffer, options = {}) {
  validateBuffer(buffer, "sticker()");
  
  const addon = getStickerAddon();
  
  const opts = {
    crop: Boolean(options.crop),
    quality: Math.min(100, Math.max(1, Number(options.quality) || 80)),
    fps: Math.min(30, Math.max(1, Number(options.fps) || 15)),
    maxDuration: Math.min(60, Math.max(1, Number(options.maxDuration) || 15)),
    packName: String(options.packName || ""),
    authorName: String(options.authorName || ""),
    emojis: Array.isArray(options.emojis) ? options.emojis : [],
  };
  
  try {
    if (isWebP(buffer)) {
      return addon.addExif(buffer, opts);
    }
    
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
  
  try {
    return addon.encodeRGBA(buf, w, h, options);
  } catch (err) {
    throw new Error(`encodeRGBA() failed: ${err.message}`);
  }
}

export function convert(input, options = {}) {
  const buf = Buffer.isBuffer(input) ? input : input?.data;
  
  validateBuffer(buf, "convert()");
  
  const addon = getConverterAddon();
  
  const opts = {
    format: String(options.format || "opus"),
    bitrate: String(options.bitrate || "64k"),
    channels: Math.min(2, Math.max(1, Number(options.channels) || 2)),
    sampleRate: Number(options.sampleRate) || 48000,
    ptt: Boolean(options.ptt),
    vbr: options.vbr !== false,
  };
  
  const validFormats = ["opus", "mp3", "aac", "m4a", "ogg"];
  if (!validFormats.includes(opts.format)) {
    throw new Error(
      `convert() invalid format: ${opts.format}. Valid formats: ${validFormats.join(", ")}`
    );
  }
  
  try {
    return addon.convert(buf, opts);
  } catch (err) {
    throw new Error(`convert() failed: ${err.message}`);
  }
}