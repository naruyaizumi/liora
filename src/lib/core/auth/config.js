/**
 * @file Signal handler and database utilities for Liora bot
 * @module core/utils
 * @description Provides signal/process management, database configuration,
 * and validation utilities for graceful shutdown and resource management.
 * @license Apache-2.0
 * @author Naruya Izumi
 */

import path from "path";

export const DEFAULT_DB = path.join(process.cwd(), "src", "database", "auth.db");

export const makeKey = (type, id) => `${type}-${id}`;

export function validateKey(key) {
    return typeof key === "string" && key.length > 0 && key.length < 512;
}

export function validateValue(value) {
    return value !== undefined;
}

const signalHandlers = new Map();
let signalHandlersInitialized = false;
let isExiting = false;
let exitTimeout = null;

function exitHandler(_signal) {
    if (isExiting) return;
    isExiting = true;

    for (const [_id, handler] of signalHandlers) {
        try {
            handler();
        } catch {
            // Silent fail
        }
    }
}

function fullExitHandler(signal) {
    exitHandler(signal);
    const code = signal === "SIGINT" ? 130 : 143;
    
    if (exitTimeout) {
        clearTimeout(exitTimeout);
    }
    
    exitTimeout = setTimeout(() => process.exit(code), 500);
    exitTimeout.unref?.();
}

export function initializeSignalHandlers() {
    if (signalHandlersInitialized) return;
    signalHandlersInitialized = true;

    try {
        process.once("exit", () => exitHandler("exit"));
        process.once("SIGINT", () => fullExitHandler("SIGINT"));
        process.once("SIGTERM", () => fullExitHandler("SIGTERM"));
        process.on("uncaughtException", (err) => {
            // Silent fail in production
        });

        process.on("unhandledRejection", (reason) => {
            // Silent fail in production
        });
    } catch {
        // Silent fail
    }
}

export function registerSignalHandler(id, handler) {
    if (typeof handler !== "function" || !id) {
        return false;
    }
    signalHandlers.set(id, handler);
    return true;
}

export function unregisterSignalHandler(id) {
    return signalHandlers.delete(id);
}