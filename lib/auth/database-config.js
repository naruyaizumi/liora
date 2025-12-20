/* eslint no-unused-vars: ["error", { "argsIgnorePattern": "^_" }] */
import path from "path";
import pino from "pino";
import fs from "fs";

export const DEFAULT_DB = path.join(process.cwd(), "database", "auth.db");

export const logger = pino({
    level: "info",
    base: { module: "AUTH" },
    transport: {
        target: "pino-pretty",
        options: {
            colorize: true,
            translateTime: "HH:MM",
            ignore: "pid,hostname",
        },
    },
});

export const makeKey = (type, id) => {
    if (!type || !id) throw new Error("Type and ID required");
    return `${type}-${id}`;
};

export function validateKey(key) {
    return (
        typeof key === "string" &&
        key.length > 0 &&
        key.length < 512 &&
        // eslint-disable-next-line no-control-regex
        !/[\u0000-\u001F\u007F]/.test(key)
    );
}

export function validateValue(value) {
    if (value === undefined) return false;
    try {
        JSON.stringify(value);
        return true;
    } catch {
        return false;
    }
}

const cleanupHandlers = new Map();
let handlersInitialized = false;
let isExiting = false;

function executeCleanup(_signal) {
    if (isExiting) return;
    isExiting = true;

    for (const [id, handler] of cleanupHandlers) {
        try {
            handler();
        } catch (e) {
            logger.error({ err: e, handler: id }, "Cleanup handler failed");
        }
    }
}

function handleExit(sig) {
    executeCleanup(sig);

    const code = sig === "SIGINT" ? 130 : 143;
    const timer = setTimeout(() => process.exit(code), 5000);

    if (timer.unref) timer.unref();

    setImmediate(() => process.exit(code));
}

export function initializeSignalHandlers() {
    if (handlersInitialized) return;
    handlersInitialized = true;

    process.once("exit", () => executeCleanup("exit"));
    process.once("SIGINT", () => handleExit("SIGINT"));
    process.once("SIGTERM", () => handleExit("SIGTERM"));

    if (process.platform !== "win32") {
        process.once("SIGHUP", () => handleExit("SIGHUP"));
        process.once("SIGQUIT", () => handleExit("SIGQUIT"));
    }

    process.on("uncaughtException", (err) => {
        logger.fatal({ err }, "Uncaught exception");
        executeCleanup("uncaughtException");
        setTimeout(() => {
            throw err;
        }, 100);
    });

    process.on("unhandledRejection", (reason) => {
        logger.error(
            {
                reason: reason instanceof Error ? reason.message : reason,
                stack: reason instanceof Error ? reason.stack : undefined,
            },
            "Unhandled rejection"
        );
    });
}

export function registerSignalHandler(id, handler) {
    if (typeof id !== "string" || typeof handler !== "function") {
        return false;
    }
    cleanupHandlers.set(id, handler);
    return true;
}

export function ensureDbDirectory(dbPath) {
    const dir = path.dirname(dbPath);

    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true, mode: 0o755 });
    }

    fs.accessSync(dir, fs.constants.W_OK);
    return true;
}

export function createBackup(dbPath) {
    if (!fs.existsSync(dbPath)) return null;

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const backupPath = path.join(
        path.dirname(dbPath),
        `${path.basename(dbPath)}.${timestamp}.backup`
    );

    fs.copyFileSync(dbPath, backupPath);

    const walPath = `${dbPath}-wal`;
    if (fs.existsSync(walPath)) {
        fs.copyFileSync(walPath, `${backupPath}-wal`);
    }

    return backupPath;
}
