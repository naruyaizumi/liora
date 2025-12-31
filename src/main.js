/* global conn */
import "./config.js";
import { serialize } from "#core/message.js";
import { useSQLAuthState } from "#auth";
import { Browsers, fetchLatestBaileysVersion } from "baileys";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import pino from "pino";
import {
    PluginCache,
    getAllPlugins,
    loadPlugins,
    initHotReload,
    EventManager,
    handleDisconnect,
    cleanupReconnect,
} from "#core/connection.js";
import { naruyaizumi } from "#core/socket.js";
import { redisStore } from "#store/store.js";

const pluginCache = new PluginCache(5000);
const pairingNumber = global.config.pairingNumber;
const pairingCode = global.config.pairingCode;

let authState = null;
let hotReloadCleanup = null;
let isShuttingDown = false;

async function setupPairingCode(conn) {
    return new Promise((resolve) => {
        const timeout = setTimeout(resolve, 3000);

        const checkConnection = setInterval(() => {
            if (conn.user || conn.ws?.readyState === 1) {
                clearInterval(checkConnection);
                clearTimeout(timeout);
                resolve();
            }
        }, 100);
    }).then(async () => {
        try {
            let code = await conn.requestPairingCode(pairingNumber, pairingCode);
            code = code?.match(/.{1,4}/g)?.join("-") || code;
            global.logger.info(`Pairing code: ${code}`);
        } catch (e) {
            global.logger.error({ error: e.message }, "Pairing code error");
        }
    });
}

async function LIORA() {
    authState = await useSQLAuthState();

    const { state, saveCreds } = authState;
    const { version: baileysVersion } = await fetchLatestBaileysVersion();

    global.logger.info(
        `[baileys] v${baileysVersion.join(".")} on ${process.platform.toUpperCase()}`
    );

    const connectionOptions = {
        version: baileysVersion,
        logger: pino({
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
        }),
        browser: Browsers.macOS("Safari"),
        auth: state,
    };

    global.conn = naruyaizumi(connectionOptions);
    global.conn.isInit = false;

    if (!state.creds.registered && pairingNumber) {
        await setupPairingCode(conn);
    }

    const eventManager = new EventManager();
    const handler = await import("./handler.js");
    eventManager.setHandler(handler);

    global.conn.connectionUpdate = handleDisconnect.bind(global.conn);
    global.conn.ev.on("connection.update", global.conn.connectionUpdate);
    global.reloadHandler = await eventManager.createReloadHandler(connectionOptions, saveCreds);

    const filename = fileURLToPath(import.meta.url);
    const srcFolder = dirname(filename);
    const pluginFolder = join(srcFolder, "./plugins");

    await loadPlugins(pluginFolder, (dir, skipCache) =>
        getAllPlugins(dir, pluginCache, skipCache)
    );

    hotReloadCleanup = initHotReload(
        srcFolder,
        pluginFolder,
        async (filename, module, isPlugin) => {
            try {
                if (module === null) {
                    if (isPlugin) {
                        const oldPlugin = global.plugins[filename];

                        if (oldPlugin && typeof oldPlugin.cleanup === "function") {
                            try {
                                await oldPlugin.cleanup();
                            } catch {
                                //
                            }
                        }

                        delete global.plugins[filename];
                    }

                    global.logger.info({ file: filename, isPlugin }, "File removed");
                } else {
                    if (isPlugin) {
                        const oldPlugin = global.plugins[filename];

                        if (typeof module === "function" || typeof module === "object") {
                            if (oldPlugin && typeof oldPlugin.cleanup === "function") {
                                try {
                                    await oldPlugin.cleanup();
                                } catch {
                                    //
                                }
                            }

                            global.plugins[filename] = module;

                            if (typeof module.init === "function") {
                                try {
                                    await module.init();
                                } catch {
                                    //
                                }
                            }
                        } else {
                            throw new Error("Invalid plugin structure");
                        }
                    }

                    global.logger.info({ file: filename, isPlugin }, "File reloaded");

                    if (
                        !isPlugin &&
                        !filename.includes("main.js") &&
                        !filename.includes("config.js") &&
                        !filename.includes("index.js")
                    ) {
                        await global.reloadHandler(false);
                    }
                }
            } catch (e) {
                global.logger.error(
                    {
                        file: filename,
                        error: e.message,
                    },
                    "File reload error"
                );
            }
        }
    );

    await global.reloadHandler();
    serialize();
}

async function gracefulShutdown(signal) {
    if (isShuttingDown) return;
    isShuttingDown = true;

    global.logger.info(`Shutting down (${signal})...`);

    try {
        if (hotReloadCleanup) {
            hotReloadCleanup();
            hotReloadCleanup = null;
        }

        cleanupReconnect();

        if (global.conn?.ws) {
            try {
                global.conn.ws.close();
                await new Promise(r => setTimeout(r, 1000));
            } catch (e) {
                global.logger.warn({ error: e.message }, "WebSocket close warning");
            }
        }

        if (global.conn?.ev) {
            try {
                global.conn.ev.removeAllListeners();
            } catch (e) {
                global.logger.warn({ error: e.message }, "Event listener cleanup warning");
            }
        }

        if (global.dbManager?.core) {
            try {
                global.logger.info("Flushing user database...");
                await Promise.race([
                    global.dbManager.core.flush(),
                    new Promise((_, reject) => 
                        setTimeout(() => reject(new Error("User flush timeout")), 5000)
                    )
                ]);
                global.logger.info("User database flushed");
            } catch (e) {
                global.logger.error({ error: e.message }, "User DB flush error");
            }
        }

        if (authState && typeof authState.dispose === "function") {
            try {
                global.logger.info("Disposing auth state...");
                await Promise.race([
                    authState.dispose(),
                    new Promise((_, reject) => 
                        setTimeout(() => reject(new Error("Auth dispose timeout")), 5000)
                    )
                ]);
                global.logger.info("Auth state disposed");
                authState = null;
            } catch (e) {
                global.logger.error({ error: e.message }, "Auth dispose error");
            }
        }

        if (global.dbManager) {
            try {
                global.logger.info("Closing user database...");
                await Promise.race([
                    global.dbManager.close(),
                    new Promise((_, reject) => 
                        setTimeout(() => reject(new Error("User close timeout")), 3000)
                    )
                ]);
                global.logger.info("User database closed");
            } catch (e) {
                global.logger.error({ error: e.message }, "User DB close error");
            }
        }

        if (redisStore) {
            try {
                global.logger.info("Disconnecting Redis...");
                const metrics = redisStore.getMetrics();
                global.logger.info({ metrics }, "Final Redis metrics");
                
                await Promise.race([
                    redisStore.disconnect(),
                    new Promise((_, reject) => 
                        setTimeout(() => reject(new Error("Redis disconnect timeout")), 3000)
                    )
                ]);
                global.logger.info("Redis disconnected");
            } catch (e) {
                global.logger.error({ error: e.message }, "Redis disconnect error");
            }
        }

        global.logger.info("Shutdown completed successfully");
    } catch (e) {
        global.logger.error({ error: e.message, stack: e.stack }, "Shutdown error");
    }
}

process.on("SIGTERM", async () => {
    await gracefulShutdown("SIGTERM");
    process.exit(0);
});

process.on("SIGINT", async () => {
    await gracefulShutdown("SIGINT");
    process.exit(0);
});

process.on("uncaughtException", async (e) => {
    global.logger.error({ error: e.message, stack: e.stack }, "Uncaught exception");
    await gracefulShutdown("uncaughtException");
    process.exit(1);
});

process.on("unhandledRejection", async (e) => {
    global.logger.error({ error: e?.message, stack: e?.stack }, "Unhandled rejection");
    await gracefulShutdown("unhandledRejection");
    process.exit(1);
});

LIORA().catch(async (e) => {
    global.logger.fatal({ error: e.message, stack: e.stack }, "Fatal initialization error");
    await gracefulShutdown("fatal");
    process.exit(1);
});