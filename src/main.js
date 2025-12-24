import "./config.js";
import { serialize } from "#core/message.js";
import { useSQLiteAuthState } from "#auth";
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
    authState = useSQLiteAuthState();
    
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
    global.reloadHandler = await eventManager.createReloadHandler(
        connectionOptions,
        saveCreds
    );

    const filename = fileURLToPath(import.meta.url);
    const pluginFolder = join(dirname(filename), "./plugins");

    await loadPlugins(pluginFolder, (dir, skipCache) =>
        getAllPlugins(dir, pluginCache, skipCache)
    );

    hotReloadCleanup = initHotReload(pluginFolder, async (filename, module) => {
        try {
            if (module === null) {
                const oldPlugin = global.plugins[filename];
                
                if (oldPlugin && typeof oldPlugin.cleanup === 'function') {
                    try {
                        await oldPlugin.cleanup();
                    } catch (e) {
                        global.logger.warn(
                            { plugin: filename, error: e.message },
                            "Plugin cleanup error"
                        );
                    }
                }

                delete global.plugins[filename];
                global.logger.info({ plugin: filename }, "Plugin removed");
            } else {
                const oldPlugin = global.plugins[filename];

                if (typeof module === 'function' || typeof module === 'object') {
                    if (oldPlugin && typeof oldPlugin.cleanup === 'function') {
                        try {
                            await oldPlugin.cleanup();
                        } catch (e) {
                            global.logger.warn(
                                { plugin: filename, error: e.message },
                                "Old plugin cleanup error"
                            );
                        }
                    }

                    global.plugins[filename] = module;
                    
                    if (typeof module.init === 'function') {
                        try {
                            await module.init();
                        } catch (e) {
                            global.logger.warn(
                                { plugin: filename, error: e.message },
                                "Plugin init error"
                            );
                        }
                    }

                    global.logger.info({ plugin: filename }, "Plugin reloaded");
                } else {
                    throw new Error("Invalid plugin structure");
                }
            }
        } catch (e) {
            global.logger.error(
                { plugin: filename, error: e.message, stack: e.stack },
                "Plugin reload handler error"
            );
        }
    });

    await global.reloadHandler();
    serialize();
}

async function gracefulShutdown(signal) {
    if (isShuttingDown) return;
    isShuttingDown = true;

    global.logger.info(`Received ${signal}, shutting down gracefully...`);
    
    try {
        if (hotReloadCleanup) {
            hotReloadCleanup();
            hotReloadCleanup = null;
        }

        cleanupReconnect();
        
        if (global.conn?.ev) {
            try {
                global.conn.ev.removeAllListeners();
            } catch (e) {
                global.logger.error({ error: e.message }, "Event cleanup error");
            }
        }

        if (global.conn?.ws) {
            try {
                global.conn.ws.close();
            } catch (e) {
                global.logger.error({ error: e.message }, "WebSocket close error");
            }
        }

        if (global.dbManager) {
            try {
                global.dbManager.close();
            } catch (e) {
                global.logger.error({ error: e.message }, "Main DB close error");
            }
        }

        if (authState && typeof authState.dispose === 'function') {
            try {
                await authState.dispose();
            } catch (e) {
                global.logger.error({ error: e.message }, "Auth DB close error");
            }
        }

        global.logger.info('Shutdown completed');
    } catch (e) {
        global.logger.error({ error: e.message }, "Shutdown error");
    }
}

process.on('SIGTERM', async () => {
    await gracefulShutdown('SIGTERM');
    process.exit(0);
});

process.on('SIGINT', async () => {
    await gracefulShutdown('SIGINT');
    process.exit(0);
});

process.on('uncaughtException', async (e) => {
    global.logger.error({ error: e.message, stack: e.stack }, 'Uncaught exception');
    await gracefulShutdown('uncaughtException');
    process.exit(1);
});

process.on('unhandledRejection', async (e) => {
    global.logger.error({ error: e?.message, stack: e?.stack }, 'Unhandled rejection');
    await gracefulShutdown('unhandledRejection');
    process.exit(1);
});

LIORA().catch(async (e) => {
    global.logger.fatal({ error: e.message, stack: e.stack }, "Fatal initialization error");
    await gracefulShutdown('fatal');
    process.exit(1);
});