/* global conn */
import "#config";
import { serialize } from "#message";
import { PostgresAuth } from "#auth";
import { fileURLToPath } from "url";
import path from "path";
import pino from "pino";
import {
    BaileysVersion,
    PluginCache,
    getAllPlugins,
    initReload,
    createConnection,
    EventManager,
    CleanupManager,
    registerProcess,
    setupMaintenance,
} from "#connection";
import { naruyaizumi } from "#socket";

const logger = pino({
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

const pluginCache = new PluginCache(5000);
const pairingNumber = global.config.pairingNumber;

let isShuttingDown = false;
let cleanupManager = null;

global.cleanupTasks = [];

async function setupPairingCode(conn) {
    const waitForConnection = new Promise((resolve) => {
        const checkConnection = setInterval(() => {
            if (conn.user || conn.ws?.readyState === 1) {
                clearInterval(checkConnection);
                resolve();
            }
        }, 100);

        setTimeout(() => {
            clearInterval(checkConnection);
            resolve();
        }, 3000);
    });

    await waitForConnection;

    try {
        let code = await conn.requestPairingCode(pairingNumber);
        code = code?.match(/.{1,4}/g)?.join("-") || code;
        logger.info(`Pairing code for ${pairingNumber}: ${code}`);
    } catch (e) {
        logger.error(e.message);
    }
}

async function gracefulShutdown(signal) {
    if (isShuttingDown) {
        logger.warn("Shutdown already in progress, ignoring duplicate signal");
        return;
    }

    isShuttingDown = true;
    logger.info(`Received ${signal}, initiating graceful shutdown...`);

    const shutdownTimeout = setTimeout(() => {
        logger.error("Graceful shutdown timeout, forcing exit");
        process.exit(1);
    }, 25000);

    try {
        for (const task of global.cleanupTasks) {
            try {
                await task();
            } catch (e) {
                logger.error({ error: e.message }, "Cleanup task failed");
            }
        }

        if (global.conn) {
            try {
                if (global.conn.ws) {
                    global.conn.ws.close();
                }
                await new Promise((resolve) => setTimeout(resolve, 1000));
            } catch (e) {
                logger.error({ error: e.message }, "Error closing WebSocket");
            }
        }

        if (cleanupManager) {
            try {
                await cleanupManager.cleanup();
            } catch (e) {
                logger.error({ error: e.message }, "Error during cleanup");
            }
        }

        await new Promise((resolve) => {
            logger.flush();
            setTimeout(resolve, 200);
        });

        clearTimeout(shutdownTimeout);
        process.exit(0);
    } catch (e) {
        logger.error({ error: e.message, stack: e.stack }, "Error during shutdown");
        clearTimeout(shutdownTimeout);
        process.exit(1);
    }
}

function setupSignalHandlers() {
    const signals = ["SIGTERM", "SIGINT"];

    signals.forEach((signal) => {
        process.on(signal, () => {
            gracefulShutdown(signal).catch((e) => {
                logger.error({ error: e.message }, `Error in ${signal} handler`);
                process.exit(1);
            });
        });
    });

    process.on("uncaughtException", (error) => {
        logger.error({ error: error.message, stack: error.stack }, "Uncaught exception");
        gracefulShutdown("uncaughtException").catch(() => process.exit(1));
    });

    process.on("unhandledRejection", (reason, promise) => {
        logger.error({ reason, promise }, "Unhandled rejection");
        gracefulShutdown("unhandledRejection").catch(() => process.exit(1));
    });
}

async function LIORA() {
    setupSignalHandlers();

    const auth = await PostgresAuth();
    const version = new BaileysVersion();
    const baileys = await version.fetchVersion();
    logger.info({ version: baileys.join(".") }, "Baileys version loaded");

    const connection = createConnection(
        baileys,
        auth,
        pino({
            level: "error",
            base: { module: "BAILEYS" },
            transport: {
                target: "pino-pretty",
                options: {
                    colorize: true,
                    translateTime: "HH:MM",
                    ignore: "pid,hostname",
                },
            },
        })
    );

    global.conn = naruyaizumi(connection);
    global.conn.isInit = false;

    if (!auth.state.creds.registered && pairingNumber) {
        await setupPairingCode(conn);
    }

    const CM = new CleanupManager();
    cleanupManager = CM;
    registerProcess(CM);

    const EM = new EventManager();
    setupMaintenance(CM);

    const handler = await import("./handler.js");
    EM.setHandler(handler);

    global.reloadHandler = await EM.createReloadHandler(
        connection,
        auth.saveCreds,
        CM,
        import.meta.url
    );

    const filename = fileURLToPath(import.meta.url);
    const dirname = path.dirname(filename);
    const pluginFolder = path.join(dirname, "../plugins");

    try {
        const reloadCleanup = await initReload(global.conn, pluginFolder, (dir, skipCache) =>
            getAllPlugins(dir, pluginCache, skipCache)
        );

        if (typeof reloadCleanup === "function") {
            CM.addCleanup(reloadCleanup);
        }

        await global.reloadHandler();
    } catch (e) {
        logger.error({ error: e.message, stack: e.stack }, "Error loading plugins");
        throw e;
    }

    serialize();
}

LIORA().catch((e) => {
    logger.fatal({ error: e.message, stack: e.stack }, "Fatal initialization error");
    process.exit(1);
});
