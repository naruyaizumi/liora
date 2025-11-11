import pino from "pino";

const logger = pino({
    level: "debug",
    base: { module: "CLEANUP MANAGER" },
    transport: {
        target: "pino-pretty",
        options: {
            colorize: true,
            translateTime: "HH:MM",
            ignore: "pid,hostname",
        },
    },
});

export class CleanupManager {
    constructor() {
        this.intervals = new Set();
        this.timeouts = new Set();
        this.cleanupFC = new Set();
        this.eventHandlers = new Map();
    }

    addInterval(id) {
        this.intervals.add(id);
        return id;
    }

    addTimeout(id) {
        this.timeouts.add(id);
        return id;
    }

    addCleanup(fn) {
        this.cleanupFC.add(fn);
    }

    registerEventHandler(eventName, handler) {
        if (!this.eventHandlers.has(eventName)) {
            this.eventHandlers.set(eventName, new Set());
        }
        this.eventHandlers.get(eventName).add(handler);
    }

    unregisterEventHandler(eventName, handler) {
        if (this.eventHandlers.has(eventName)) {
            this.eventHandlers.get(eventName).delete(handler);
        }
    }

    async cleanup() {
        this.intervals.forEach((id) => clearInterval(id));
        this.timeouts.forEach((id) => clearTimeout(id));
        if (global.conn?.ev) {
            for (const [eventName, handlers] of this.eventHandlers) {
                for (const handler of handlers) {
                    try {
                        global.conn.ev.off(eventName, handler);
                    } catch (e) {
                        logger.error(e.message);
                    }
                }
            }
        }

        for (const fn of this.cleanupFC) {
            try {
                await fn();
            } catch (e) {
                logger.error(e.message);
            }
        }

        this.intervals.clear();
        this.timeouts.clear();
        this.cleanupFC.clear();
        this.eventHandlers.clear();
    }
}

let isShuttingDown = false;

export async function shutdown(signal, cleanupManager) {
    if (isShuttingDown) {
        return;
    }

    isShuttingDown = true;
    const startTime = Date.now();

    const emergency = setTimeout(() => {
        logger.error("Shutdown taking too long, FORCE EXITING!");
        process.exit(1);
    }, 8000);

    cleanupManager.addTimeout(emergency);

    try {
        await cleanupManager.cleanup();
        if (global.conn?.ws) {
            try {
                global.conn.ws.close();
            } catch (e) {
                logger.error(e.message);
            }
        }

        if (global.conn?.ev) {
            try {
                global.conn.ev.removeAllListeners();
            } catch (e) {
                logger.error(e.message);
            }
        }

        if (global.sqlite) {
            try {
                global.sqlite.exec("PRAGMA wal_checkpoint(TRUNCATE);");
                global.sqlite.close();
            } catch (e) {
                logger.error(e.message);
            }
        }

        clearTimeout(emergency);

        const elapsed = Date.now() - startTime;
        logger.info(`Graceful shutdown complete in ${elapsed}ms`);

        await new Promise((resolve) => setTimeout(resolve, 100));
        process.exit(0);
    } catch (e) {
        clearTimeout(emergency);
        logger.error(e.message);
        process.exit(1);
    }
}

export function registerProcessHandlers(cleanupManager, logger) {
    process.once("SIGTERM", () => {
        shutdown("SIGTERM", cleanupManager).catch((e) => {
            logger.error(e.message);
            process.exit(1);
        });
    });

    process.once("SIGINT", () => {
        shutdown("SIGINT", cleanupManager).catch((e) => {
            logger.error(e.message);
            process.exit(1);
        });
    });

    process.on("uncaughtException", (e) => {
        logger.error(e.message);
        if (e?.stack) logger.error(e.stack);
        shutdown("UNCAUGHT_EXCEPTION", cleanupManager).catch(() => process.exit(1));
    });

    process.on("unhandledRejection", (e) => {
        logger.error(e.message);
        if (e?.stack) logger.error(e.stack);
        shutdown("UNHANDLED_REJECTION", cleanupManager).catch(() => process.exit(1));
    });
}
