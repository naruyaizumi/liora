import { dlopen, FFIType, suffix } from "bun:ffi";

const LIBRARY_CACHE = new Map();
const INIT_STATUS = new Map();

function loadLibrary(baseName, symbols, versions = []) {
  const cacheKey = baseName;
  
  if (LIBRARY_CACHE.has(cacheKey)) {
    return LIBRARY_CACHE.get(cacheKey);
  }

  const candidates = versions.length > 0
    ? versions.map(v => `${baseName}.${suffix}.${v}`)
    : [`${baseName}.${suffix}`];

  let lastError;
  for (const libName of candidates) {
    try {
      const lib = dlopen(libName, symbols);
      LIBRARY_CACHE.set(cacheKey, lib);
      return lib;
    } catch (err) {
      lastError = err;
      continue;
    }
  }

  throw new Error(
    `Failed to load ${baseName}. Tried: ${candidates.join(", ")}. Last error: ${lastError?.message}`
  );
}

export function loadWebP() {
  if (INIT_STATUS.get("webp")) return LIBRARY_CACHE.get("libwebp");

  const webp = loadLibrary("libwebp", {
    WebPEncodeRGBA: {
      args: [FFIType.ptr, FFIType.i32, FFIType.i32, FFIType.i32, FFIType.f32, FFIType.ptr],
      returns: FFIType.i32,
    },
    WebPFree: {
      args: [FFIType.ptr],
      returns: FFIType.void,
    },
    WebPDecodeRGBA: {
      args: [FFIType.ptr, FFIType.u64, FFIType.ptr, FFIType.ptr],
      returns: FFIType.ptr,
    },
  });

  INIT_STATUS.set("webp", true);
  return webp;
}

export function loadWebPMux() {
  if (INIT_STATUS.get("webpmux")) return LIBRARY_CACHE.get("libwebpmux");

  const webpmux = loadLibrary("libwebpmux", {
    /*
    WebPMuxNew: {
      args: [],
      returns: FFIType.ptr,
    },
    */
    WebPMuxDelete: {
      args: [FFIType.ptr],
      returns: FFIType.void,
    },
    WebPMuxSetChunk: {
      args: [FFIType.ptr, FFIType.cstring, FFIType.ptr, FFIType.i32],
      returns: FFIType.i32,
    },
    WebPMuxAssemble: {
      args: [FFIType.ptr, FFIType.ptr],
      returns: FFIType.i32,
    },
    WebPMuxCreate: {
      args: [FFIType.ptr, FFIType.i32],
      returns: FFIType.ptr,
    },
    WebPDataInit: {
      args: [FFIType.ptr],
      returns: FFIType.void,
    },
    WebPDataClear: {
      args: [FFIType.ptr],
      returns: FFIType.void,
    },
  });

  INIT_STATUS.set("webpmux", true);
  return webpmux;
}

export function getLibraryStatus() {
  return {
    webp: INIT_STATUS.get("webp") || false,
    webpmux: INIT_STATUS.get("webpmux") || false,
  };
}

export function cleanup() {
  LIBRARY_CACHE.clear();
  INIT_STATUS.clear();
}