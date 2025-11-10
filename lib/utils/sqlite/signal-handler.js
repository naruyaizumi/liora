/* eslint no-unused-vars: ["error", { "argsIgnorePattern": "^_" }] */
import { logger } from "./database-config.js";

const signalHandlers = new Map();
let signalHandlersInitialized = false;
let isExiting = false;

function exitHandler(_signal) {
    if (isExiting) return;
    isExiting = true;

    const handlers = Array.from(signalHandlers.entries());
    for (const [id, handler] of handlers) {
        try {
            handler();
        } catch (e) {
            logger.error({ err: e.message, handler: id, context: "exitHandler" });
        }
    }
}

function fullExitHandler(signal) {
    exitHandler(signal);

    const timer = setTimeout(() => {
        process.exit(signal === "SIGINT" ? 130 : 143);
    }, 1000);

    timer.unref?.();
}

const CRITICAL_ERROR_CODES = new Set([
    "ENOSPC",
    "ENOMEM",
    "SQLITE_CORRUPT",
    "SQLITE_CANTOPEN",
    "EACCES",
    "SQLITE_NOTADB",
]);

export function initializeSignalHandlers() {
    if (signalHandlersInitialized) return;
    signalHandlersInitialized = true;

    try {
        process.once("exit", () => exitHandler("exit"));
        process.once("SIGINT", () => fullExitHandler("SIGINT"));
        process.once("SIGTERM", () => fullExitHandler("SIGTERM"));
        process.once("uncaughtException", (err) => {
            logger.fatal({
                err: err.message,
                stack: err.stack,
                code: err.code,
                context: "uncaughtException",
            });

            exitHandler("uncaughtException");

            setTimeout(() => {
                process.exit(1);
            }, 1000);
        });

        process.on("unhandledRejection", (reason, promise) => {
            const errorCode = reason?.code || reason?.errno;
            const isCritical = errorCode && CRITICAL_ERROR_CODES.has(errorCode);

            if (isCritical) {
                logger.fatal({
                    reason: reason?.message || String(reason),
                    code: errorCode,
                    stack: reason?.stack,
                    context: "CRITICAL unhandledRejection",
                });

                exitHandler("unhandledRejection");

                setTimeout(() => {
                    process.exit(1);
                }, 2000);
            } else {
                logger.error({
                    reason: reason?.message || String(reason),
                    code: errorCode,
                    stack: reason?.stack,
                    promise: String(promise),
                    context: "unhandledRejection (non-critical)",
                });
            }
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
