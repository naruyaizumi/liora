const VERSION = 1;

const TYPE_NULL = 0;
const TYPE_RAW_BINARY = 1;
const TYPE_STRING = 2;
const TYPE_NUMBER = 3;
const TYPE_BOOLEAN = 4;
const TYPE_OBJECT = 5;
const TYPE_ARRAY = 6;

class BufferPool {
  constructor() {
    this.pools = new Map();
    this.maxPoolSize = 10;
  }

  acquire(size) {
    const bucketSize = Math.pow(2, Math.ceil(Math.log2(size)));

    const pool = this.pools.get(bucketSize);
    if (pool && pool.length > 0) {
      return pool.pop();
    }

    return new Uint8Array(bucketSize);
  }

  release(buffer) {
    const size = buffer.length;

    if (!this.pools.has(size)) {
      this.pools.set(size, []);
    }

    const pool = this.pools.get(size);
    if (pool.length < this.maxPoolSize) {
      buffer.fill(0);
      pool.push(buffer);
    }
  }

  clear() {
    this.pools.clear();
  }
}

const bufferPool = new BufferPool();

export function serialize(value) {
  if (value === null || value === undefined) {
    return null;
  }

  if (value instanceof Uint8Array) {
    return value;
  }

  if (value?.constructor?.name === "Buffer") {
    return new Uint8Array(value);
  }

  const chunks = [];
  const size = 1 + calculateSize(value, chunks);

  const buffer = bufferPool.acquire(size);
  buffer[0] = VERSION;

  const actualSize = writeValue(buffer, 1, value, chunks);

  const result = buffer.slice(0, actualSize);
  bufferPool.release(buffer);

  return result;
}

export function deserialize(bytes) {
  if (!bytes || bytes.length === 0) {
    return null;
  }

  if (!(bytes instanceof Uint8Array)) {
    bytes = new Uint8Array(bytes);
  }

  if (bytes.length > 0 && bytes[0] === VERSION) {
    try {
      const { value } = readValue(bytes, 1);
      return value;
    } catch {
      return bytes;
    }
  }

  return bytes;
}

function calculateSize(value, chunks) {
  if (value === null || value === undefined) {
    return 1;
  }

  if (value instanceof Uint8Array) {
    return 1 + 4 + value.length;
  }

  if (typeof value === "string") {
    const encoder = new TextEncoder();
    const bytes = encoder.encode(value);
    chunks.push(bytes);
    return 1 + 4 + bytes.byteLength;
  }

  if (typeof value === "number") {
    return 1 + 8;
  }

  if (typeof value === "boolean") {
    return 1 + 1;
  }

  if (Array.isArray(value)) {
    let size = 1 + 4;
    const childChunks = [];
    for (const item of value) {
      const itemChunks = [];
      size += calculateSize(item, itemChunks);
      childChunks.push(itemChunks);
    }
    chunks.push(childChunks);
    return size;
  }

  if (typeof value === "object") {
    const entries = Object.entries(value);
    let size = 1 + 4;
    const entryChunks = [];

    const encoder = new TextEncoder();
    for (const [key, val] of entries) {
      const keyBytes = encoder.encode(key);
      const valChunks = [];
      const valSize = calculateSize(val, valChunks);

      size += 4 + keyBytes.byteLength + valSize;
      entryChunks.push({ keyBytes, valChunks });
    }

    chunks.push(entryChunks);
    return size;
  }

  return 1;
}

function writeValue(buffer, offset, value, chunks) {
  const view = new DataView(buffer.buffer, buffer.byteOffset);
  let pos = offset;

  if (value === null || value === undefined) {
    view.setUint8(pos, TYPE_NULL);
    return pos + 1;
  }

  if (value instanceof Uint8Array) {
    view.setUint8(pos, TYPE_RAW_BINARY);
    pos += 1;
    view.setUint32(pos, value.length, true);
    pos += 4;
    buffer.set(value, pos);
    return pos + value.length;
  }

  if (typeof value === "string") {
    const bytes = chunks.shift();
    view.setUint8(pos, TYPE_STRING);
    pos += 1;
    view.setUint32(pos, bytes.byteLength, true);
    pos += 4;
    buffer.set(bytes, pos);
    return pos + bytes.byteLength;
  }

  if (typeof value === "number") {
    view.setUint8(pos, TYPE_NUMBER);
    pos += 1;
    view.setFloat64(pos, value, true);
    return pos + 8;
  }

  if (typeof value === "boolean") {
    view.setUint8(pos, TYPE_BOOLEAN);
    pos += 1;
    view.setUint8(pos, value ? 1 : 0);
    return pos + 1;
  }

  if (Array.isArray(value)) {
    view.setUint8(pos, TYPE_ARRAY);
    pos += 1;
    view.setUint32(pos, value.length, true);
    pos += 4;

    const childChunks = chunks.shift();
    for (let i = 0; i < value.length; i++) {
      pos = writeValue(buffer, pos, value[i], childChunks[i]);
    }
    return pos;
  }

  if (typeof value === "object") {
    const entries = Object.entries(value);
    view.setUint8(pos, TYPE_OBJECT);
    pos += 1;
    view.setUint32(pos, entries.length, true);
    pos += 4;

    const entryChunks = chunks.shift();
    for (let i = 0; i < entries.length; i++) {
      const [key, val] = entries[i];
      const { keyBytes, valChunks } = entryChunks[i];

      view.setUint32(pos, keyBytes.byteLength, true);
      pos += 4;
      buffer.set(keyBytes, pos);
      pos += keyBytes.byteLength;

      pos = writeValue(buffer, pos, val, valChunks);
    }
    return pos;
  }

  view.setUint8(pos, TYPE_NULL);
  return pos + 1;
}

function readValue(buffer, offset) {
  const view = new DataView(buffer.buffer, buffer.byteOffset);
  let pos = offset;

  const type = view.getUint8(pos);
  pos += 1;

  if (type === TYPE_NULL) {
    return { value: null, offset: pos };
  }

  if (type === TYPE_RAW_BINARY) {
    const len = view.getUint32(pos, true);
    pos += 4;
    const value = buffer.slice(pos, pos + len);
    return { value, offset: pos + len };
  }

  if (type === TYPE_STRING) {
    const len = view.getUint32(pos, true);
    pos += 4;
    const bytes = buffer.slice(pos, pos + len);
    const decoder = new TextDecoder();
    const value = decoder.decode(bytes);
    return { value, offset: pos + len };
  }

  if (type === TYPE_NUMBER) {
    const value = view.getFloat64(pos, true);
    return { value, offset: pos + 8 };
  }

  if (type === TYPE_BOOLEAN) {
    const value = view.getUint8(pos) === 1;
    return { value: value, offset: pos + 1 };
  }

  if (type === TYPE_ARRAY) {
    const len = view.getUint32(pos, true);
    pos += 4;
    const arr = [];
    for (let i = 0; i < len; i++) {
      const result = readValue(buffer, pos);
      arr.push(result.value);
      pos = result.offset;
    }
    return { value: arr, offset: pos };
  }

  if (type === TYPE_OBJECT) {
    const count = view.getUint32(pos, true);
    pos += 4;
    const obj = {};

    const decoder = new TextDecoder();
    for (let i = 0; i < count; i++) {
      const keyLen = view.getUint32(pos, true);
      pos += 4;
      const keyBytes = buffer.slice(pos, pos + keyLen);
      const key = decoder.decode(keyBytes);
      pos += keyLen;

      const result = readValue(buffer, pos);
      obj[key] = result.value;
      pos = result.offset;
    }

    return { value: obj, offset: pos };
  }

  return { value: null, offset: pos };
}

export const makeKey = (type, id) => `${type}-${id}`;

export function clearBufferPool() {
  bufferPool.clear();
}
