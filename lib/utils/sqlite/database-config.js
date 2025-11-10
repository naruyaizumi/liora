import path from "path";
import pino from "pino";

export const DEFAULT_DB = path.join(process.cwd(), "database", "auth.db");

export const logger = pino({
    level: "debug",
    base: { module: "AUTH SESSION" },
    transport: {
        target: "pino-pretty",
        options: {
            colorize: true,
            translateTime: "HH:MM",
            ignore: "pid,hostname",
        },
    },
});

export function serialize(obj) {
    if (obj === null || obj === undefined) return null;
    
    try {
        if (Buffer.isBuffer(obj)) {
            return obj;
        }
        return serializeToBinary(obj);
    } catch (e) {
        logger.error({ err: e.message, context: "serialize" });
        return null;
    }
}

export function deserialize(buffer) {
    if (!buffer || buffer.length === 0) return null;
    
    try {
        return deserializeFromBinary(buffer);
    } catch (e) {
        logger.error({ err: e.message, context: "deserialize" });
        return null;
    }
}

function serializeToBinary(obj) {
    const type = typeof obj;
    
    if (obj === null) {
        return Buffer.from([0x00]);
    }
    
    if (type === 'string') {
        const strBuf = Buffer.from(obj, 'utf8');
        const header = Buffer.allocUnsafe(5);
        header[0] = 0x01;
        header.writeUInt32BE(strBuf.length, 1);
        return Buffer.concat([header, strBuf]);
    }
    
    if (type === 'number') {
        const buf = Buffer.allocUnsafe(9);
        buf[0] = 0x02;
        buf.writeDoubleBE(obj, 1);
        return buf;
    }
    
    if (type === 'boolean') {
        const buf = Buffer.allocUnsafe(2);
        buf[0] = 0x03;
        buf[1] = obj ? 1 : 0;
        return buf;
    }
    
    if (Buffer.isBuffer(obj)) {
        const header = Buffer.allocUnsafe(5);
        header[0] = 0x04;
        header.writeUInt32BE(obj.length, 1);
        return Buffer.concat([header, obj]);
    }
    
    if (Array.isArray(obj)) {
        const parts = [Buffer.from([0x05])];
        const lenBuf = Buffer.allocUnsafe(4);
        lenBuf.writeUInt32BE(obj.length, 0);
        parts.push(lenBuf);
        
        for (const item of obj) {
            const itemBuf = serializeToBinary(item);
            if (itemBuf) parts.push(itemBuf);
        }
        
        return Buffer.concat(parts);
    }
    
    if (type === 'object') {
        const parts = [Buffer.from([0x06])];
        const keys = Object.keys(obj);
        const lenBuf = Buffer.allocUnsafe(4);
        lenBuf.writeUInt32BE(keys.length, 0);
        parts.push(lenBuf);
        
        for (const key of keys) {
            const keyBuf = serializeToBinary(key);
            const valBuf = serializeToBinary(obj[key]);
            if (keyBuf && valBuf) {
                parts.push(keyBuf, valBuf);
            }
        }
        
        return Buffer.concat(parts);
    }
    
    return Buffer.from([0x00]);
}

function deserializeFromBinary(buffer) {
    if (!buffer || buffer.length === 0) return null;
    
    const type = buffer[0];
    let offset = 1;
    
    switch (type) {
        case 0x00:
            return null;
            
        case 0x01: {
            const len = buffer.readUInt32BE(offset);
            offset += 4;
            return buffer.slice(offset, offset + len).toString('utf8');
        }
        
        case 0x02:
            return buffer.readDoubleBE(offset);
            
        case 0x03:
            return buffer[offset] === 1;
            
        case 0x04: {
            const len = buffer.readUInt32BE(offset);
            offset += 4;
            return buffer.slice(offset, offset + len);
        }
        
        case 0x05: {
            const len = buffer.readUInt32BE(offset);
            offset += 4;
            const arr = [];
            
            for (let i = 0; i < len; i++) {
                const result = deserializeWithOffset(buffer, offset);
                arr.push(result.value);
                offset = result.newOffset;
            }
            
            return arr;
        }
        
        case 0x06: {
            const len = buffer.readUInt32BE(offset);
            offset += 4;
            const obj = {};
            
            for (let i = 0; i < len; i++) {
                const keyResult = deserializeWithOffset(buffer, offset);
                offset = keyResult.newOffset;
                
                const valResult = deserializeWithOffset(buffer, offset);
                offset = valResult.newOffset;
                
                obj[keyResult.value] = valResult.value;
            }
            
            return obj;
        }
        
        default:
            throw new Error(`Unknown type: 0x${type.toString(16)}`);
    }
}

function deserializeWithOffset(buffer, offset) {
    const type = buffer[offset];
    offset += 1;
    
    switch (type) {
        case 0x00:
            return { value: null, newOffset: offset };
            
        case 0x01: {
            const len = buffer.readUInt32BE(offset);
            offset += 4;
            const value = buffer.slice(offset, offset + len).toString('utf8');
            return { value, newOffset: offset + len };
        }
        
        case 0x02: {
            const value = buffer.readDoubleBE(offset);
            return { value, newOffset: offset + 8 };
        }
        
        case 0x03: {
            const value = buffer[offset] === 1;
            return { value, newOffset: offset + 1 };
        }
        
        case 0x04: {
            const len = buffer.readUInt32BE(offset);
            offset += 4;
            const value = buffer.slice(offset, offset + len);
            return { value, newOffset: offset + len };
        }
        
        case 0x05: {
            const len = buffer.readUInt32BE(offset);
            offset += 4;
            const arr = [];
            
            for (let i = 0; i < len; i++) {
                const result = deserializeWithOffset(buffer, offset);
                arr.push(result.value);
                offset = result.newOffset;
            }
            
            return { value: arr, newOffset: offset };
        }
        
        case 0x06: {
            const len = buffer.readUInt32BE(offset);
            offset += 4;
            const obj = {};
            
            for (let i = 0; i < len; i++) {
                const keyResult = deserializeWithOffset(buffer, offset);
                offset = keyResult.newOffset;
                
                const valResult = deserializeWithOffset(buffer, offset);
                offset = valResult.newOffset;
                
                obj[keyResult.value] = valResult.value;
            }
            
            return { value: obj, newOffset: offset };
        }
        
        default:
            throw new Error(`Unknown type: 0x${type.toString(16)}`);
    }
}

export const makeKey = (type, id) => `${type}-${id}`;

export function validateKey(key) {
    return typeof key === 'string' && key.length > 0 && key.length < 512;
}

export function validateValue(value) {
    return value !== undefined && (
        value === null ||
        typeof value === 'object' ||
        typeof value === 'string' ||
        typeof value === 'number' ||
        typeof value === 'boolean' ||
        Buffer.isBuffer?.(value)
    );
}