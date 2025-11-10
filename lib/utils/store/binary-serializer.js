/* eslint no-unused-vars: ["error", { "argsIgnorePattern": "^_" }] */
import { Buffer } from "node:buffer";
import { brotliCompressSync, brotliDecompressSync, constants } from "node:zlib";

const TYPE_NULL = 0x00;
const TYPE_UNDEFINED = 0x01;
const TYPE_BOOLEAN_TRUE = 0x02;
const TYPE_BOOLEAN_FALSE = 0x03;
const TYPE_NUMBER = 0x04;
const TYPE_BIGINT = 0x05;
const TYPE_STRING = 0x06;
const TYPE_BUFFER = 0x07;
const TYPE_ARRAY = 0x08;
const TYPE_OBJECT = 0x09;
const TYPE_DATE = 0x0a;

class BinarySerializer {
    static serialize(data) {
        try {
            if (data === null || data === undefined) {
                return Buffer.from([data === null ? TYPE_NULL : TYPE_UNDEFINED]);
            }

            const chunks = [];
            this._serializeValue(data, chunks);
            return Buffer.concat(chunks);
        } catch (e) {
            throw new Error(`Serialization failed: ${e.message}`);
        }
    }

    static _serializeValue(value, chunks) {
        if (value === null) {
            chunks.push(Buffer.from([TYPE_NULL]));
            return;
        }

        if (value === undefined) {
            chunks.push(Buffer.from([TYPE_UNDEFINED]));
            return;
        }

        const type = typeof value;

        if (type === "boolean") {
            chunks.push(Buffer.from([value ? TYPE_BOOLEAN_TRUE : TYPE_BOOLEAN_FALSE]));
            return;
        }

        if (type === "number") {
            const buf = Buffer.allocUnsafe(9);
            buf[0] = TYPE_NUMBER;
            buf.writeDoubleBE(value, 1);
            chunks.push(buf);
            return;
        }

        if (type === "bigint") {
            const str = value.toString();
            const strBuf = Buffer.from(str, "utf8");
            const lenBuf = Buffer.allocUnsafe(5);
            lenBuf[0] = TYPE_BIGINT;
            lenBuf.writeUInt32BE(strBuf.length, 1);
            chunks.push(lenBuf, strBuf);
            return;
        }

        if (type === "string") {
            const strBuf = Buffer.from(value, "utf8");
            const lenBuf = Buffer.allocUnsafe(5);
            lenBuf[0] = TYPE_STRING;
            lenBuf.writeUInt32BE(strBuf.length, 1);
            chunks.push(lenBuf, strBuf);
            return;
        }

        if (Buffer.isBuffer(value)) {
            const lenBuf = Buffer.allocUnsafe(5);
            lenBuf[0] = TYPE_BUFFER;
            lenBuf.writeUInt32BE(value.length, 1);
            chunks.push(lenBuf, value);
            return;
        }

        if (value instanceof Date) {
            const buf = Buffer.allocUnsafe(9);
            buf[0] = TYPE_DATE;
            buf.writeDoubleBE(value.getTime(), 1);
            chunks.push(buf);
            return;
        }

        if (Array.isArray(value)) {
            const lenBuf = Buffer.allocUnsafe(5);
            lenBuf[0] = TYPE_ARRAY;
            lenBuf.writeUInt32BE(value.length, 1);
            chunks.push(lenBuf);

            for (let i = 0; i < value.length; i++) {
                this._serializeValue(value[i], chunks);
            }
            return;
        }

        if (type === "object") {
            const keys = Object.keys(value);
            const lenBuf = Buffer.allocUnsafe(5);
            lenBuf[0] = TYPE_OBJECT;
            lenBuf.writeUInt32BE(keys.length, 1);
            chunks.push(lenBuf);

            for (const key of keys) {
                const keyBuf = Buffer.from(key, "utf8");
                const keyLenBuf = Buffer.allocUnsafe(4);
                keyLenBuf.writeUInt32BE(keyBuf.length, 0);
                chunks.push(keyLenBuf, keyBuf);
                this._serializeValue(value[key], chunks);
            }
            return;
        }

        throw new Error(`Unsupported type: ${type}`);
    }

    static deserialize(buffer) {
        try {
            if (!Buffer.isBuffer(buffer) || buffer.length === 0) {
                return null;
            }

            const state = { offset: 0 };
            return this._deserializeValue(buffer, state);
        } catch (e) {
            throw new Error(`Deserialization failed: ${e.message}`);
        }
    }

    static _deserializeValue(buffer, state) {
        if (state.offset >= buffer.length) {
            throw new Error("Unexpected end of buffer");
        }

        const type = buffer[state.offset++];

        switch (type) {
            case TYPE_NULL:
                return null;

            case TYPE_UNDEFINED:
                return undefined;

            case TYPE_BOOLEAN_TRUE:
                return true;

            case TYPE_BOOLEAN_FALSE:
                return false;

            case TYPE_NUMBER: {
                if (state.offset + 8 > buffer.length) {
                    throw new Error("Buffer too short for number");
                }
                const value = buffer.readDoubleBE(state.offset);
                state.offset += 8;
                return value;
            }

            case TYPE_BIGINT: {
                if (state.offset + 4 > buffer.length) {
                    throw new Error("Buffer too short for bigint length");
                }
                const len = buffer.readUInt32BE(state.offset);
                state.offset += 4;

                if (state.offset + len > buffer.length) {
                    throw new Error("Buffer too short for bigint data");
                }
                const str = buffer.toString("utf8", state.offset, state.offset + len);
                state.offset += len;
                return BigInt(str);
            }

            case TYPE_STRING: {
                if (state.offset + 4 > buffer.length) {
                    throw new Error("Buffer too short for string length");
                }
                const len = buffer.readUInt32BE(state.offset);
                state.offset += 4;

                if (state.offset + len > buffer.length) {
                    throw new Error("Buffer too short for string data");
                }
                const str = buffer.toString("utf8", state.offset, state.offset + len);
                state.offset += len;
                return str;
            }

            case TYPE_BUFFER: {
                if (state.offset + 4 > buffer.length) {
                    throw new Error("Buffer too short for buffer length");
                }
                const len = buffer.readUInt32BE(state.offset);
                state.offset += 4;

                if (state.offset + len > buffer.length) {
                    throw new Error("Buffer too short for buffer data");
                }
                const buf = buffer.slice(state.offset, state.offset + len);
                state.offset += len;
                return buf;
            }

            case TYPE_DATE: {
                if (state.offset + 8 > buffer.length) {
                    throw new Error("Buffer too short for date");
                }
                const timestamp = buffer.readDoubleBE(state.offset);
                state.offset += 8;
                return new Date(timestamp);
            }

            case TYPE_ARRAY: {
                if (state.offset + 4 > buffer.length) {
                    throw new Error("Buffer too short for array length");
                }
                const len = buffer.readUInt32BE(state.offset);
                state.offset += 4;

                const arr = new Array(len);
                for (let i = 0; i < len; i++) {
                    arr[i] = this._deserializeValue(buffer, state);
                }
                return arr;
            }

            case TYPE_OBJECT: {
                if (state.offset + 4 > buffer.length) {
                    throw new Error("Buffer too short for object length");
                }
                const len = buffer.readUInt32BE(state.offset);
                state.offset += 4;

                const obj = {};
                for (let i = 0; i < len; i++) {
                    if (state.offset + 4 > buffer.length) {
                        throw new Error("Buffer too short for key length");
                    }
                    const keyLen = buffer.readUInt32BE(state.offset);
                    state.offset += 4;

                    if (state.offset + keyLen > buffer.length) {
                        throw new Error("Buffer too short for key data");
                    }
                    const key = buffer.toString("utf8", state.offset, state.offset + keyLen);
                    state.offset += keyLen;

                    obj[key] = this._deserializeValue(buffer, state);
                }
                return obj;
            }

            default:
                throw new Error(`Unknown type: 0x${type.toString(16)}`);
        }
    }

    static validate(buffer) {
        try {
            if (!Buffer.isBuffer(buffer) || buffer.length === 0) {
                return false;
            }
            this.deserialize(buffer);
            return true;
        } catch {
            return false;
        }
    }

    static compress(buffer) {
        try {
            return brotliCompressSync(buffer, {
                params: {
                    [constants.BROTLI_PARAM_QUALITY]: 4,
                    [constants.BROTLI_PARAM_MODE]: constants.BROTLI_MODE_GENERIC,
                },
            });
        } catch {
            return buffer;
        }
    }

    static decompress(buffer) {
        try {
            return brotliDecompressSync(buffer);
        } catch {
            return buffer;
        }
    }
}

export default BinarySerializer;
