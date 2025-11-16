/* global conn */
import "#config";
import { serialize } from "#message";
import { SQLiteAuth } from "#sqlite-auth";
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
    setupMaintenance
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

async function LIORA() {
    const auth = SQLiteAuth();
    const version = new BaileysVersion();
    const baileys = await version.fetchVersion();
    logger.info({ version: baileys.join(".") }, "Baileys version loaded");
    const connection = createConnection(
        baileys,
        auth,
        pino({
            level: "fatal",
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
    registerProcess(CM);
    const EM = new EventManager();
    setupMaintenance(CM);
    const handler = await import("../handler.js");
    EM.setHandler(handler);

    global.reloadHandler = await EM.createReloadHandler(
        connection,
        auth.saveCreds,
        CM,
        import.meta.url
    );
    const filename = fileURLToPath(import.meta.url);
    const dirname  = path.dirname(filename);
    const pluginFolder = path.join(dirname, "../plugins");

    try {
        const reloadCleanup = await initReload(
            global.conn,
            pluginFolder,
            (dir, skipCache) => getAllPlugins(dir, pluginCache, skipCache)
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