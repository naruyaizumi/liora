/* eslint no-unused-vars: ["error", { "argsIgnorePattern": "^_" }] */
import { logger } from "./database-config.js";

const signalHandlers = new Map();
let signalHandlersInitialized = false;

function exitHandler(_signal) {
    for (const [, handler] of signalHandlers) {
        try {
            handler();
        } catch (e) {
            logger.error(e.message);
        }
    }
}

function fullExitHandler(signal) {
    exitHandler(signal);
    setTimeout(() => {
        process.exit(signal === "SIGINT" ? 130 : 143);
    }, 500);
}

export function initializeSignalHandlers() {
    if (signalHandlersInitialized) return;
    signalHandlersInitialized = true;

    process.once("exit", () => exitHandler("exit"));
    process.once("SIGINT", () => fullExitHandler("SIGINT"));
    process.once("SIGTERM", () => fullExitHandler("SIGTERM"));
}

export function registerSignalHandler(id, handler) {
    signalHandlers.set(id, handler);
}

export function unregisterSignalHandler(id) {
    signalHandlers.delete(id);
}
