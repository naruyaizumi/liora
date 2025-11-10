/* global conn */
import "#config";
import "#global";
import { serialize } from "#message";
import { naruyaizumi } from "#socket";
import { SQLiteAuth } from "#sqlite-auth";
import { SQLiteKeyStore } from "#sqlite-keystore";
import { Browsers, fetchLatestBaileysVersion } from "baileys";
import { readdir, stat } from "fs/promises";
import { join } from "path";
import EventEmitter from "eventemitter3";
import { initReload } from "#loader-plugins";
import pino from "pino";
import { CleanupManager, registerProcessHandlers } from "#cleaner";
import { EventManager, setupMaintenanceIntervals } from "#event";

const logger = pino({
    level: "debug",
    base: { module: "MAIN INITIALIZER" },
    transport: {
        target: "pino-pretty",
        options: {
            colorize: true,
            translateTime: "HH:MM",
            ignore: "pid,hostname",
        },
    },
});

const pairingNumber = global.config.pairingNumber;

EventEmitter.defaultMaxListeners = 20;

serialize();

const CM = new CleanupManager();
const EM = new EventManager();

registerProcessHandlers(CM, logger);

let pluginCache = null;
let pluginCacheTime = 0;
const CACHE_TTL = 5000;

async function getAllPlugins(dir, skipCache = false) {
    const now = Date.now();
    
    if (!skipCache && pluginCache && (now - pluginCacheTime) < CACHE_TTL) {
        return pluginCache;
    }
    
    const results = [];
    try {
        const files = await readdir(dir);
        const filePromises = files.map(async (file) => {
            const filepath = join(dir, file);
            try {
                const stats = await stat(filepath);
                if (stats.isDirectory()) {
                    return await getAllPlugins(filepath, true);
                } else if (/\.js$/.test(file)) {
                    return [filepath];
                }
                return [];
            } catch (e) {
                logger.warn(e.message);
                return [];
            }
        });
        
        const nestedResults = await Promise.all(filePromises);
        results.push(...nestedResults.flat());
    } catch (e) {
        logger.error(e.message);
    }
    
    pluginCache = results;
    pluginCacheTime = now;
    
    return results;
}

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
        let code = await conn.requestPairingCode(pairingNumber, conn.Pairing);
        code = code?.match(/.{1,4}/g)?.join("-") || code;
        logger.info(`Pairing code for ${pairingNumber}: ${code}`);
    } catch (e) {
        logger.error(e.message);
    }
}

async function IZUMI() {
    const { state, saveCreds } = await SQLiteAuth();
    const { version: baileysVersion } = await fetchLatestBaileysVersion();
    logger.info(
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
        browser: Browsers.ubuntu("Safari"),
        auth: {
            creds: state.creds,
            keys: SQLiteKeyStore(),
        },
    };
    
    global.conn = naruyaizumi(connectionOptions);
    conn.isInit = false;
    
    if (!state.creds.registered && pairingNumber) {
        await setupPairingCode(conn);
    }
    
    setupMaintenanceIntervals(CM, logger);
    
    let handler = await import("../handler.js");
    EM.setHandler(handler);
    
    global.reloadHandler = await EM.createReloadHandler(
        connectionOptions,
        saveCreds,
        CM,
        import.meta.url
    );
    
    const pluginFolder = global.__dirname(
        join(global.__dirname(import.meta.url), "../plugins/index")
    );
    
    try {
        const reloadCleanup = await initReload(conn, pluginFolder, getAllPlugins);
        
        if (typeof reloadCleanup === 'function') {
            CM.addCleanup(reloadCleanup);
        }
        
        await global.reloadHandler();
        
        logger.info("Bot initialized successfully");
        
    } catch (e) {
        logger.error(e.message);
        if (e?.stack) logger.error(e.stack);
        throw e;
    }
}

IZUMI().catch((e) => {
    logger.fatal(e.message);
    if (e?.stack) logger.fatal(e.stack);
    process.exit(1);
});