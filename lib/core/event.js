import { DisconnectReason } from "./connection.js";
import { naruyaizumi } from "./socket.js";
import pino from "pino";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const logger = pino({
    level: "debug",
    base: { module: "EVENT MANAGER" },
    transport: {
        target: "pino-pretty",
        options: {
            colorize: true,
            translateTime: "HH:MM",
            ignore: "pid,hostname",
        },
    },
});

export class EventManager {
    constructor() {
        this.eventHandlers = new Map();
        this.isInit = true;
        this.currentHandler = null;
    }

    clear() {
        this.eventHandlers.clear();
    }

    setHandler(handler) {
        this.currentHandler = handler;
    }

    registerHandlers(conn, handler, saveCreds, cleanupManager) {
        conn.handler = handler?.handler?.bind(global.conn) || (() => {});
        conn.connectionUpdate = DisconnectReason?.bind(global.conn) || (() => {});
        conn.credsUpdate = saveCreds?.bind(global.conn) || (() => {});

        if (conn?.ev) {
            const handlers = [
                { event: "messages.upsert", handler: conn.handler },
                { event: "connection.update", handler: conn.connectionUpdate },
                { event: "creds.update", handler: conn.credsUpdate },
            ];

            for (const { event, handler } of handlers) {
                if (typeof handler === "function") {
                    conn.ev.on(event, handler);
                    this.eventHandlers.set(event, handler);
                    cleanupManager.registerEventHandler(event, handler);
                }
            }
        }
    }

    unregisterHandlers(conn, cleanupManager) {
        if (!this.isInit && conn?.ev) {
            const events = ["messages.upsert", "connection.update", "creds.update"];

            for (const ev of events) {
                if (this.eventHandlers.has(ev)) {
                    const oldHandler = this.eventHandlers.get(ev);
                    conn.ev.off(ev, oldHandler);
                    cleanupManager.unregisterEventHandler(ev, oldHandler);
                }
            }

            this.clear();
        }
    }

    async createReloadHandler(connectionOptions, saveCreds, cleanupManager, mainPath) {
        const eventManager = this;
        const handlerPath = resolve(dirname(fileURLToPath(mainPath)), "../handler.js");

        return async function (restartConn = false) {
            let handler = eventManager.currentHandler;

            try {
                const HandlerModule = await import(`${handlerPath}?update=${Date.now()}`).catch(
                    (e) => {
                        logger.error(`Failed to import handler: ${e.message}`);
                        return null;
                    }
                );

                if (HandlerModule && typeof HandlerModule.handler === "function") {
                    handler = HandlerModule;
                    eventManager.setHandler(handler);
                }
            } catch (e) {
                logger.error(`Handler reload error: ${e.message}`);
            }

            if (!handler) {
                logger.error("No handler available, skipping reload");
                return false;
            }

            if (restartConn) {
                const oldChats = global.conn?.chats || {};

                try {
                    if (global.conn?.ev) {
                        for (const [eventName, handler] of eventManager.eventHandlers) {
                            global.conn.ev.off(eventName, handler);
                            cleanupManager.unregisterEventHandler(eventName, handler);
                        }
                        global.conn.ev.removeAllListeners();
                    }

                    if (global.conn?.ws) {
                        global.conn.ws.close();
                    }

                    global.conn = null;

                    if (typeof Bun !== "undefined" && typeof Bun.gc === "function") {
                        Bun.gc(false);
                    }
                } catch (e) {
                    logger.error(`Connection restart error: ${e.message}`);
                }

                global.conn = naruyaizumi(connectionOptions, { chats: oldChats });
                eventManager.isInit = true;
            }

            eventManager.unregisterHandlers(global.conn, cleanupManager);
            eventManager.registerHandlers(global.conn, handler, saveCreds, cleanupManager);

            eventManager.isInit = false;
            return true;
        };
    }
}

export function setupMaintenanceIntervals(cleanupManager, logger) {
    const maintenanceInterval = setInterval(async () => {
        if (!global.sqlite) return;

        try {
            global.sqlite.exec("PRAGMA wal_checkpoint(TRUNCATE);");
            global.sqlite.exec("PRAGMA optimize;");
            const now = Date.now();
            if (!global.lastVacuum || now - global.lastVacuum > 3600000) {
                global.sqlite.exec("VACUUM;");
                global.lastVacuum = now;
                logger.debug("Database vacuumed");
            }
        } catch (e) {
            logger.error(e.message);
        }
    }, 300000);

    cleanupManager.addInterval(maintenanceInterval);

    const memoryMonitorInterval = setInterval(() => {
        const usage = process.memoryUsage();
        const heapUsedMB = Math.round(usage.heapUsed / 1024 / 1024);
        const heapTotalMB = Math.round(usage.heapTotal / 1024 / 1024);

        if (heapUsedMB > 500) {
            logger.debug(`Memory usage: ${heapUsedMB}MB / ${heapTotalMB}MB`);

            if (typeof Bun !== "undefined" && typeof Bun.gc === "function") {
                Bun.gc(false);
                logger.debug("Forced garbage collection");
            }
        }
    }, 60000);

    cleanupManager.addInterval(memoryMonitorInterval);
}
