/* eslint no-unused-vars: ["error", { "argsIgnorePattern": "^_" }] */
import path from "path";
import { BufferJSON } from "baileys";
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

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

export function serialize(obj) {
    if (obj === null || obj === undefined) return null;
    
    try {
        const jsonStr = JSON.stringify(obj, BufferJSON.replacer);
        return textEncoder.encode(jsonStr);
    } catch (e) {
        logger.error({ err: e.message, context: "serialize" });
        return null;
    }
}

export function deserialize(buffer) {
    if (!buffer || buffer.length === 0) return null;
    
    try {
        const jsonStr = textDecoder.decode(buffer);
        return JSON.parse(jsonStr, BufferJSON.reviver);
    } catch (e) {
        logger.error({ err: e.message, context: "deserialize" });
        return null;
    }
}

export function serializeFallback(obj) {
    try {
        return JSON.stringify(obj, BufferJSON.replacer);
    } catch (e) {
        logger.error({ err: e.message, context: "serializeFallback" });
        return null;
    }
}

export function deserializeFallback(str) {
    if (!str) return null;
    try {
        return JSON.parse(str, BufferJSON.reviver);
    } catch (e) {
        logger.error({ err: e.message, context: "deserializeFallback" });
        return null;
    }
}

export const makeKey = (type, id) => `${type}-${id}`;

export function validateKey(key) {
    return typeof key === 'string' && key.length > 0 && key.length < 512;
}

export function validateValue(value) {
    return (
        value !== undefined &&
        (
            value === null ||
            typeof value === "object" ||
            typeof value === "string" ||
            typeof value === "number" ||
            typeof value === "boolean"
        )
    );
}