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
    const bucketSize = 1 << (32 - Math.clz32(size - 1));

    const pool = this.pools.get(bucketSize);
    if (pool && pool.length > 0) {
      return pool.pop();
    }

    return new Uint8Array(bucketSize);
  }

  release(buffer) {
    const size = buffer.byteLength;

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
const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

export function serialize(value) {
  if (value === null || value === undefined) {
    return null;
  }

  if (value instanceof Uint8Array) {
    return value;
  }

  if (ArrayBuffer.isView(value)) {
    return new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
  }

  const chunks = [];
  const size = 1 + calculateSize(value, chunks);

  const buffer = bufferPool.acquire(size);
  buffer[0] = VERSION;

  const actualSize = writeValue(buffer, 1, value, chunks);

  const result = buffer.subarray(0, actualSize);
  bufferPool.release(buffer);

  return result;
}

export function deserialize(bytes) {
  if (!bytes || bytes.byteLength === 0) {
    return null;
  }

  if (!(bytes instanceof Uint8Array)) {
    if (ArrayBuffer.isView(bytes)) {
      bytes = new Uint8Array(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    } else {
      return null;
    }
  }

  if (bytes.byteLength > 0 && bytes[0] === VERSION) {
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
    return 5 + value.byteLength;
  }

  if (typeof value === "string") {
    const bytes = textEncoder.encode(value);
    chunks.push(bytes);
    return 5 + bytes.byteLength;
  }

  if (typeof value === "number") {
    return 9;
  }

  if (typeof value === "boolean") {
    return 2;
  }

  if (Array.isArray(value)) {
    let size = 5;
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
    let size = 5;
    const entryChunks = [];

    for (const [key, val] of entries) {
      const keyBytes = textEncoder.encode(key);
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
  const view = new DataView(
    buffer.buffer,
    buffer.byteOffset,
    buffer.byteLength,
  );
  let pos = offset;

  if (value === null || value === undefined) {
    view.setUint8(pos, TYPE_NULL);
    return pos + 1;
  }

  if (value instanceof Uint8Array) {
    view.setUint8(pos, TYPE_RAW_BINARY);
    view.setUint32(pos + 1, value.byteLength, true);
    buffer.set(value, pos + 5);
    return pos + 5 + value.byteLength;
  }

  if (typeof value === "string") {
    const bytes = chunks.shift();
    view.setUint8(pos, TYPE_STRING);
    view.setUint32(pos + 1, bytes.byteLength, true);
    buffer.set(bytes, pos + 5);
    return pos + 5 + bytes.byteLength;
  }

  if (typeof value === "number") {
    view.setUint8(pos, TYPE_NUMBER);
    view.setFloat64(pos + 1, value, true);
    return pos + 9;
  }

  if (typeof value === "boolean") {
    view.setUint8(pos, TYPE_BOOLEAN);
    view.setUint8(pos + 1, value ? 1 : 0);
    return pos + 2;
  }

  if (Array.isArray(value)) {
    view.setUint8(pos, TYPE_ARRAY);
    view.setUint32(pos + 1, value.length, true);
    pos += 5;

    const childChunks = chunks.shift();
    for (let i = 0; i < value.length; i++) {
      pos = writeValue(buffer, pos, value[i], childChunks[i]);
    }
    return pos;
  }

  if (typeof value === "object") {
    const entries = Object.entries(value);
    view.setUint8(pos, TYPE_OBJECT);
    view.setUint32(pos + 1, entries.length, true);
    pos += 5;

    const entryChunks = chunks.shift();
    for (let i = 0; i < entries.length; i++) {
      const [key, val] = entries[i];
      const { keyBytes, valChunks } = entryChunks[i];

      view.setUint32(pos, keyBytes.byteLength, true);
      buffer.set(keyBytes, pos + 4);
      pos += 4 + keyBytes.byteLength;

      pos = writeValue(buffer, pos, val, valChunks);
    }
    return pos;
  }

  view.setUint8(pos, TYPE_NULL);
  return pos + 1;
}

function readValue(buffer, offset) {
  const view = new DataView(
    buffer.buffer,
    buffer.byteOffset,
    buffer.byteLength,
  );
  let pos = offset;

  const type = view.getUint8(pos);
  pos += 1;

  switch (type) {
    case TYPE_NULL:
      return { value: null, offset: pos };

    case TYPE_RAW_BINARY: {
      const len = view.getUint32(pos, true);
      pos += 4;
      const value = buffer.subarray(pos, pos + len);
      return { value, offset: pos + len };
    }

    case TYPE_STRING: {
      const len = view.getUint32(pos, true);
      pos += 4;
      const bytes = buffer.subarray(pos, pos + len);
      const value = textDecoder.decode(bytes);
      return { value, offset: pos + len };
    }

    case TYPE_NUMBER: {
      const value = view.getFloat64(pos, true);
      return { value, offset: pos + 8 };
    }

    case TYPE_BOOLEAN: {
      const value = view.getUint8(pos) === 1;
      return { value, offset: pos + 1 };
    }

    case TYPE_ARRAY: {
      const len = view.getUint32(pos, true);
      pos += 4;
      const arr = new Array(len);
      for (let i = 0; i < len; i++) {
        const result = readValue(buffer, pos);
        arr[i] = result.value;
        pos = result.offset;
      }
      return { value: arr, offset: pos };
    }

    case TYPE_OBJECT: {
      const count = view.getUint32(pos, true);
      pos += 4;
      const obj = Object.create(null);

      for (let i = 0; i < count; i++) {
        const keyLen = view.getUint32(pos, true);
        pos += 4;
        const keyBytes = buffer.subarray(pos, pos + keyLen);
        const key = textDecoder.decode(keyBytes);
        pos += keyLen;

        const result = readValue(buffer, pos);
        obj[key] = result.value;
        pos = result.offset;
      }

      return { value: obj, offset: pos };
    }

    default:
      return { value: null, offset: pos };
  }
}

export const makeKey = (type, id) => `${type}-${id}`;
