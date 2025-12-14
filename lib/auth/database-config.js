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
    if (!type || !id) {
        throw new Error("Type and ID are required for key generation");
    }
    return `${type}-${id}`;
};

export function validateKey(key) {
    if (typeof key !== "string") {
        logger.debug({ key, type: typeof key }, "Key validation failed: not a string");
        return false;
    }

    if (key.length === 0) {
        logger.debug("Key validation failed: empty string");
        return false;
    }

    if (key.length >= 512) {
        logger.debug({ length: key.length }, "Key validation failed: exceeds max length");
        return false;
    }

    if (/[\x00-\x1F\x7F]/.test(key)) {
        logger.debug({ key }, "Key validation failed: contains control characters");
        return false;
    }

    return true;
}

export function validateValue(value) {
    if (value === undefined) {
        return false;
    }

    try {
        JSON.stringify(value);
        return true;
    } catch (e) {
        logger.debug({ error: e.message }, "Value validation failed: cannot stringify");
        return false;
    }
}

const signalHandlers = new Map();
let signalHandlersInitialized = false;
let isExiting = false;
let exitTimer = null;

function exitHandler(signal) {
    if (isExiting) {
        logger.debug({ signal }, "Already exiting, ignoring duplicate signal");
        return;
    }

    isExiting = true;
    logger.info({ signal }, "Initiating graceful shutdown");

    const handlersArray = Array.from(signalHandlers.entries());
    const failures = [];

    for (const [id, handler] of handlersArray) {
        try {
            logger.debug({ handler: id }, "Executing cleanup handler");
            handler();
        } catch (e) {
            failures.push({ id, error: e.message });
            logger.error(
                {
                    err: e,
                    handler: id,
                    context: "exitHandler",
                },
                "Cleanup handler failed"
            );
        }
    }

    if (failures.length > 0) {
        logger.warn(
            {
                failures,
                total: handlersArray.length,
            },
            "Some cleanup handlers failed"
        );
    } else {
        logger.info(
            {
                handlersExecuted: handlersArray.length,
            },
            "All cleanup handlers executed successfully"
        );
    }
}

function fullExitHandler(signal) {
    logger.info({ signal }, "Received termination signal");

    exitHandler(signal);

    const code = signal === "SIGINT" ? 130 : 143;

    if (exitTimer) {
        clearTimeout(exitTimer);
    }

    exitTimer = setTimeout(() => {
        logger.warn({ code }, "Force exiting after timeout");
        process.exit(code);
    }, 5000);

    if (exitTimer.unref) {
        exitTimer.unref();
    }

    setImmediate(() => {
        logger.info({ code }, "Graceful exit");
        process.exit(code);
    });
}

export function initializeSignalHandlers() {
    if (signalHandlersInitialized) {
        logger.debug("Signal handlers already initialized");
        return;
    }

    signalHandlersInitialized = true;

    try {
        process.once("exit", (code) => {
            logger.info({ code }, "Process exit event");
            exitHandler("exit");
        });

        process.once("SIGINT", () => fullExitHandler("SIGINT"));
        process.once("SIGTERM", () => fullExitHandler("SIGTERM"));

        if (process.platform !== "win32") {
            process.once("SIGHUP", () => fullExitHandler("SIGHUP"));
            process.once("SIGQUIT", () => fullExitHandler("SIGQUIT"));
        }

        process.on("uncaughtException", (err, origin) => {
            logger.fatal(
                {
                    err,
                    origin,
                    stack: err.stack,
                    context: "uncaughtException",
                },
                "Uncaught exception detected"
            );

            exitHandler("uncaughtException");

            setTimeout(() => {
                throw err;
            }, 100);
        });

        process.on("unhandledRejection", (reason, promise) => {
            logger.error(
                {
                    reason: reason instanceof Error ? reason.message : reason,
                    stack: reason instanceof Error ? reason.stack : undefined,
                    promise: promise.toString(),
                    context: "unhandledRejection",
                },
                "Unhandled promise rejection"
            );
        });

        process.on("warning", (warning) => {
            logger.warn(
                {
                    name: warning.name,
                    message: warning.message,
                    stack: warning.stack,
                    context: "processWarning",
                },
                "Process warning emitted"
            );
        });

        logger.info("Signal handlers initialized successfully");
    } catch (e) {
        logger.error(
            {
                err: e,
                context: "initializeSignalHandlers",
            },
            "Failed to initialize signal handlers"
        );
        throw e;
    }
}

export function registerSignalHandler(id, handler) {
    if (!id || typeof id !== "string") {
        logger.warn({ id, context: "registerSignalHandler: invalid id" });
        return false;
    }

    if (typeof handler !== "function") {
        logger.warn({ id, context: "registerSignalHandler: invalid handler" });
        return false;
    }

    if (signalHandlers.has(id)) {
        logger.warn({ id }, "Handler already registered, replacing");
    }

    signalHandlers.set(id, handler);
    logger.debug({ id }, "Signal handler registered");
    return true;
}

export function unregisterSignalHandler(id) {
    const removed = signalHandlers.delete(id);
    if (removed) {
        logger.debug({ id }, "Signal handler unregistered");
    }
    return removed;
}

export function ensureDbDirectory(dbPath) {
    try {
        const dir = path.dirname(dbPath);

        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true, mode: 0o755 });
            logger.info({ dir }, "Database directory created");
        }

        fs.accessSync(dir, fs.constants.W_OK);

        return true;
    } catch (e) {
        logger.error(
            {
                err: e,
                dbPath,
                context: "ensureDbDirectory",
            },
            "Failed to ensure database directory"
        );
        throw e;
    }
}

export function createBackup(dbPath, backupDir) {
    try {
        if (!fs.existsSync(dbPath)) {
            logger.warn({ dbPath }, "Database file does not exist, skipping backup");
            return null;
        }

        const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
        const backupPath = path.join(
            backupDir || path.dirname(dbPath),
            `${path.basename(dbPath)}.${timestamp}.backup`
        );

        fs.copyFileSync(dbPath, backupPath);

        const walPath = `${dbPath}-wal`;
        const shmPath = `${dbPath}-shm`;

        if (fs.existsSync(walPath)) {
            fs.copyFileSync(walPath, `${backupPath}-wal`);
        }

        if (fs.existsSync(shmPath)) {
            fs.copyFileSync(shmPath, `${backupPath}-shm`);
        }

        logger.info({ backupPath }, "Database backup created");
        return backupPath;
    } catch (e) {
        logger.error(
            {
                err: e,
                dbPath,
                context: "createBackup",
            },
            "Failed to create backup"
        );
        return null;
    }
}

export function cleanupOldBackups(dbPath, maxAge = 7 * 24 * 60 * 60 * 1000) {
    try {
        const dir = path.dirname(dbPath);
        const baseName = path.basename(dbPath);
        const files = fs.readdirSync(dir);

        const backupPattern = new RegExp(`^${baseName}\\..*\\.backup$`);
        const now = Date.now();
        let cleaned = 0;

        for (const file of files) {
            if (backupPattern.test(file)) {
                const filePath = path.join(dir, file);
                const stats = fs.statSync(filePath);

                if (now - stats.mtimeMs > maxAge) {
                    fs.unlinkSync(filePath);
                    cleaned++;

                    const walFile = `${filePath}-wal`;
                    const shmFile = `${filePath}-shm`;

                    if (fs.existsSync(walFile)) fs.unlinkSync(walFile);
                    if (fs.existsSync(shmFile)) fs.unlinkSync(shmFile);
                }
            }
        }

        if (cleaned > 0) {
            logger.info({ cleaned }, "Old backups cleaned up");
        }

        return cleaned;
    } catch (e) {
        logger.error(
            {
                err: e,
                context: "cleanupOldBackups",
            },
            "Failed to cleanup old backups"
        );
        return 0;
    }
}
