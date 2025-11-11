/* eslint no-unused-vars: ["error", { "argsIgnorePattern": "^_" }] */
import { logger } from "./database-config.js";

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
            logger.error({ err: e.message, handler: id,
                context: "exitHandler" });
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