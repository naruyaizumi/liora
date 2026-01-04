import "./config.js";
import { serialize } from "#core/message.js";
import { useSQLAuthState } from "#auth";
import { Browsers, fetchLatestBaileysVersion } from "baileys";
import { dirname, join } from "node:path";
import {
    getAllPlugins,
    loadPlugins,
    EventManager,
    handleDisconnect,
    cleanupReconnect,
    reloadAllPlugins,
    reloadSinglePlugin
} from "#core/connection.js";
import { naruyaizumi } from "#core/socket.js";

const pairingNumber = global.config.pairingNumber;
const pairingCode = global.config.pairingCode;

let authState = null;
let isShuttingDown = false;

const baileysLogger = () => {
    const LEVELS = {
        fatal: 60,
        error: 50,
        warn: 40,
        info: 30,
        debug: 20,
        trace: 10,
    };

    const currentLevel = LEVELS[Bun.env.BAILEYS_LOG_LEVEL?.toLowerCase() || 'silent'];
    const shouldLog = (level) => LEVELS[level] >= currentLevel;

    const formatValue = (value) => {
        if (value === null) return 'null';
        if (value === undefined) return 'undefined';
        if (value instanceof Error) return value.message || value.toString();
        if (typeof value === 'object') {
            try {
                return JSON.stringify(value);
            } catch {
                return value.toString();
            }
        }
        return String(value);
    };

    const formatLog = (level, ...args) => {
        const time = new Date().toTimeString().slice(0, 5);
        const levelName = level.toUpperCase();
        const formattedArgs = args.map(arg => formatValue(arg));
        
        let message = '';
        let object = null;
        
        if (args.length > 0 && typeof args[0] === 'object' && args[0] !== null) {
            object = args[0];
            message = formattedArgs.slice(1).join(' ');
        } else {
            message = formattedArgs.join(' ');
        }
        
        if (object && Object.keys(object).length > 0) {
            const objectLines = Object.entries(object)
                .map(([key, value]) => `    ${key}: ${formatValue(value)}`)
                .join('\n');
            return `[${time}] ${levelName}: ${message}\n${objectLines}`;
        }
        return `[${time}] ${levelName}: ${message}`;
    };

    return {
        level: 'silent',
        fatal: (...args) => { if (shouldLog('fatal')) console.error(formatLog('fatal', ...args)); },
        error: (...args) => { if (shouldLog('error')) console.error(formatLog('error', ...args)); },
        warn: (...args) => { if (shouldLog('warn')) console.warn(formatLog('warn', ...args)); },
        info: (...args) => { if (shouldLog('info')) console.log(formatLog('info', ...args)); },
        debug: (...args) => { if (shouldLog('debug')) console.debug(formatLog('debug', ...args)); },
        trace: (...args) => { if (shouldLog('trace')) console.trace(formatLog('trace', ...args)); },
        child: () => baileysLogger(),
    };
};

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
    const connectionOptions = {
        version: baileysVersion,
        logger: baileysLogger(),
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

    const filename = Bun.fileURLToPath(import.meta.url);
    const srcFolder = dirname(filename);
    const pluginFolder = join(srcFolder, "./plugins");

    await loadPlugins(pluginFolder, (dir) => getAllPlugins(dir));

    global.pluginFolder = pluginFolder;
    
    global.reloadAllPlugins = async () => {
        return reloadAllPlugins(pluginFolder);
    };
    
    global.reloadSinglePlugin = async (filepath) => {
        return reloadSinglePlugin(filepath, pluginFolder);
    };

    await global.reloadHandler();
    serialize();
}

async function gracefulShutdown(signal) {
    if (isShuttingDown) return;
    isShuttingDown = true;

    global.logger.info(`Shutting down (${signal})...`);

    try {
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
                global.logger.warn({ error: e.message }, "Event cleanup warning");
            }
        }

        if (authState && typeof authState.dispose === "function") {
            try {
                await Promise.race([
                    authState.dispose(),
                    new Promise((_, reject) => 
                        setTimeout(() => reject(new Error("Dispose timeout")), 5000)
                    )
                ]);
                authState = null;
            } catch (e) {
                global.logger.error({ error: e.message }, "Dispose error");
            }
        }

        global.logger.info("Shutdown completed");
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
    global.logger.fatal({ error: e.message, stack: e.stack }, "Fatal error");
    await gracefulShutdown("fatal");
    process.exit(1);
});