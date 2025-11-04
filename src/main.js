/* global conn */
process.on("uncaughtException", (e) => logger.error(e));
process.on("unhandledRejection", (e) => logger.error(e));

import "./config.js";
import "./global.js";
import { serialize } from "../lib/core/message.js";
import { protoType } from "../lib/core/prototype.js";
import { naruyaizumi } from "../lib/core/socket.js";
import { SQLiteAuth, SQLiteKeyStore } from "../lib/utils/auth.js";
import { Browsers, fetchLatestBaileysVersion } from "baileys";
import { readdir, stat } from "fs/promises";
import { join } from "path";
import { EventEmitter } from "events";
import { DisconnectReason } from "../lib/core/connection.js";
import { initReload } from "../lib/core/loader-plugins.js";
import pino from "pino";

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

EventEmitter.defaultMaxListeners = 0;

protoType();
serialize();

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
        const waitForConnection = new Promise((resolve) => {
            const checkConnection = setInterval(() => {
                if (conn.user || conn.ws?.readyState ===
                    1) {
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
            let code = await conn.requestPairingCode(pairingNumber, conn
                .Pairing);
            code = code?.match(/.{1,4}/g)?.join("-") || code;
            logger.info(`Pairing code for ${pairingNumber}: ${code}`);
        } catch (e) {
            logger.error(e.message);
        }
    }
    
    const maintenanceInterval = setInterval(async () => {
        if (!global.sqlite) {
            return;
        }
        
        try {
            const checkpoint = global.sqlite.prepare(
                "PRAGMA wal_checkpoint(FULL);");
            checkpoint.run();
            const optimize = global.sqlite.prepare(
                "PRAGMA optimize;");
            optimize.run();
        } catch (e) {
            logger.error(e.message);
        }
    }, 600 * 1000);
    
    process.on("SIGINT", () => {
        clearInterval(maintenanceInterval);
        if (global.sqlite) {
            try {
                global.sqlite.close();
            } catch (e) {
                logger.error(e.message);
            }
        }
        process.exit(0);
    });
    
    let isInit = true;
    let handler = await import("../handler.js");
    
    global.reloadHandler = async function(restartConn = false) {
        try {
            const HandlerModule = await import(
                `../handler.js?update=${Date.now()}`
            ).catch((e) => {
                logger.error(e.message);
                return null;
            });
            
            if (HandlerModule && typeof HandlerModule.handler ===
                "function") {
                handler = HandlerModule;
            }
        } catch (e) {
            logger.error(e.message);
        }
        
        if (restartConn) {
            const oldChats = global.conn?.chats || {};
            try {
                global.conn.ws?.close();
            } catch (e) {
                logger.error(e.message);
            }
            
            if (conn.ev) {
                conn.ev.removeAllListeners();
            }
            
            global.conn = naruyaizumi(
            connectionOptions, { chats: oldChats });
            isInit = true;
        }
        
        if (!isInit && conn.ev) {
            const events = [
                ["messages.upsert", conn.handler],
                ["group-participants.update", conn
                    .participantsUpdate
                ],
                ["messages.delete", conn.onDelete],
                ["connection.update", conn.connectionUpdate],
                ["creds.update", conn.credsUpdate],
            ];
            
            for (const [ev, fn] of events) {
                if (typeof fn === "function") {
                    conn.ev.off(ev, fn);
                }
            }
        }
        
        conn.handler = handler?.handler?.bind(global.conn) || (
    () => {});
        conn.participantsUpdate = handler?.participantsUpdate?.bind(
            global.conn) || (() => {});
        conn.onDelete = handler?.deleteUpdate?.bind(global.conn) ||
            (() => {});
        conn.connectionUpdate = DisconnectReason?.bind(global
            .conn) || (() => {});
        conn.credsUpdate = saveCreds?.bind(global.conn) || (
        () => {});
        
        if (conn.ev) {
            if (typeof conn.handler === "function") {
                conn.ev.on("messages.upsert", conn.handler);
            }
            if (typeof conn.participantsUpdate === "function") {
                conn.ev.on("group-participants.update", conn
                    .participantsUpdate);
            }
            if (typeof conn.onDelete === "function") {
                conn.ev.on("messages.delete", conn.onDelete);
            }
            if (typeof conn.connectionUpdate === "function") {
                conn.ev.on("connection.update", conn
                    .connectionUpdate);
            }
            if (typeof conn.credsUpdate === "function") {
                conn.ev.on("creds.update", conn.credsUpdate);
            }
        }
        
        isInit = false;
        return true;
    };
    
    const pluginFolder = global.__dirname(
        join(global.__dirname(import.meta.url), "../plugins/index")
    );
    
    async function getAllPlugins(dir) {
        const results = [];
        try {
            const files = await readdir(dir);
            for (const file of files) {
                const filepath = join(dir, file);
                try {
                    const stats = await stat(filepath);
                    if (stats.isDirectory()) {
                        results.push(...(await getAllPlugins(
                        filepath)));
                    } else if (/\.js$/.test(file)) {
                        results.push(filepath);
                    }
                } catch (e) {
                    logger.warn(e.message);
                }
            }
        } catch (e) {
            logger.error(e.message);
        }
        return results;
    }
    
    try {
        await initReload(conn, pluginFolder, getAllPlugins);
        await global.reloadHandler();
    } catch (e) {
        logger.error(e.message);
        throw e;
    }
}

IZUMI().catch((e) => {
    logger.fatal(e.message);
    process.exit(1);
});