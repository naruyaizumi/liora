/* eslint no-unused-vars: ["error", { "argsIgnorePattern": "^_" }] */
import path from "path";
import { BufferJSON } from "baileys";
import pino from "pino";

export const DEFAULT_DB = path.join(process.cwd(), "database", "auth.db");

export const logger = pino({
    level: "info",
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

export const makeKey = (type, id) => `${type}-${id}`;

export function validateKey(key) {
    return typeof key === "string" && key.length > 0 && key.length < 512;
}

export function validateValue(value) {
    return (
        value !== undefined &&
        (value === null ||
            typeof value === "object" ||
            typeof value === "string" ||
            typeof value === "number" ||
            typeof value === "boolean")
    );
}

const signalHandlers = new Map();
let signalHandlersInitialized = false;
let isExiting = false;

function exitHandler(_signal) {
    if (isExiting) return;
    isExiting = true;

    for (const [id, handler] of signalHandlers) {
        try {
            handler();
        } catch (e) {
            logger.error({ err: e.message, handler: id, context: "exitHandler" });
        }
    }
}

function fullExitHandler(signal) {
    exitHandler(signal);
    const code = signal === "SIGINT" ? 130 : 143;
    const timer = setTimeout(() => process.exit(code), 500);
    timer.unref?.();
}

export function initializeSignalHandlers() {
    if (signalHandlersInitialized) return;
    signalHandlersInitialized = true;

    try {
        process.once("exit", () => exitHandler("exit"));
        process.once("SIGINT", () => fullExitHandler("SIGINT"));
        process.once("SIGTERM", () => fullExitHandler("SIGTERM"));
        process.on("uncaughtException", (err) => {
            logger.error({
                err: err.message,
                stack: err.stack,
                context: "uncaughtException",
            });
        });

        process.on("unhandledRejection", (reason) => {
            logger.error({
                reason,
                context: "unhandledRejection",
            });
        });
    } catch (e) {
        logger.error({ err: e.message, context: "initializeSignalHandlers" });
    }
}

export function registerSignalHandler(id, handler) {
    if (typeof handler !== "function") {
        logger.warn({ id, context: "registerSignalHandler: invalid handler" });
        return false;
    }
    signalHandlers.set(id, handler);
    return true;
}

export function unregisterSignalHandler(id) {
    return signalHandlers.delete(id);
}