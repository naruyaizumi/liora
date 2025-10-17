/* global conn */
process.on("uncaughtException", console.error);
process.on("unhandledRejection", console.error);

import "./config.js";
import "./global.js";
import { naruyaizumi, protoType, serialize } from "./lib/message.js";
import { SQLiteAuth, SQLiteKeyStore } from "./lib/auth.js";
import { schedule } from "liora-lib";
import { Browsers } from "baileys";
import { readdir, stat } from "fs/promises";
import { join } from "path";
import chalk from "chalk";
import P from "pino";
import {
    initReload,
    initCron,
    connectionUpdateHandler,
    getBaileysVersion,
} from "./lib/connection.js";

const pairingAuth = global.config.pairingAuth;
const pairingNumber = global.config.pairingNumber;

protoType();
serialize();

async function IZUMI() {
    const { state, saveCreds } = SQLiteAuth();
    const baileysVersion = await getBaileysVersion();
    console.log(
        chalk.cyan(
            `\n[baileys] v${baileysVersion.join(".")} on ${process.platform.toUpperCase()}\n`
        )
    );

    const connectionOptions = {
        version: baileysVersion,
        logger: P({ level: "error" }),
        printQRInTerminal: !pairingAuth,
        browser: Browsers.ubuntu("Safari"),
        emitOwnEvents: false,
        syncFullHistory: false,
        auth: {
            creds: state.creds,
            keys: SQLiteKeyStore(),
        },
    };

    global.conn = naruyaizumi(connectionOptions);
    conn.isInit = false;

    if (pairingAuth && !conn.authState.creds.registered) {
        setTimeout(async () => {
            try {
                let code = await conn.requestPairingCode(pairingNumber, conn.Pairing);
                code = code?.match(/.{1,4}/g)?.join("-") || code;
                console.log(chalk.green(`Pairing code for ${pairingNumber}: ${code}`));
            } catch (err) {
                console.error("Pairing code error:", err.message);
            }
        }, 2500);
    }

    schedule(
        "db-flush",
        () => {
            try {
                global.sqlite.prepare("PRAGMA wal_checkpoint(FULL);").run();
                global.sqlite.prepare("PRAGMA optimize;").run();
            } catch (e) {
                console.error("DB checkpoint:", e.message);
            }
        },
        { intervalSeconds: 600 }
    );

    let isInit = true;
    let handler = await import("./handler.js");

    function detachAllEvents() {
        if (!conn?.ev) return;
        const events = [
            "messages.upsert",
            "group-participants.update",
            "message.delete",
            "connection.update",
            "creds.update",
        ];
        for (const ev of events) conn.ev.removeAllListeners(ev);
    }

    function attachAllEvents() {
        if (!conn?.ev) return;

        conn.handler = handler?.handler?.bind(global.conn) || (() => {});
        conn.participantsUpdate = handler?.participantsUpdate?.bind(global.conn) || (() => {});
        conn.onDelete = handler?.deleteUpdate?.bind(global.conn) || (() => {});
        conn.connectionUpdate = connectionUpdateHandler?.bind(global.conn) || (() => {});
        conn.credsUpdate = saveCreds?.bind(global.conn) || (() => {});

        conn.ev.on("messages.upsert", conn.handler);
        conn.ev.on("group-participants.update", conn.participantsUpdate);
        conn.ev.on("message.delete", conn.onDelete);
        conn.ev.on("connection.update", conn.connectionUpdate);
        conn.ev.on("creds.update", conn.credsUpdate);
    }
    
    async function restartConnHard() {
        try {
            try { detachAllEvents(); } catch {}
            try { conn.ws?.close(); } catch {}
            try { delete conn.ws; } catch {}
            await new Promise((r) => setTimeout(r, 1200));
            const oldChats = global.conn?.chats || {};
            global.conn = naruyaizumi(connectionOptions, { chats: oldChats });
        } catch (e) {
            console.error("restartConnHard:", e.message);
        }
    }

    global.reloadHandler = async function (restartConn = false) {
        try {
            const HandlerModule = await import(`./handler.js?update=${Date.now()}`).catch(
                () => null
            );
            if (HandlerModule && typeof HandlerModule.handler === "function") {
                handler = HandlerModule;
            }
        } catch (e) {
            console.error(`Reload failed: ${e.message}`);
        }

        if (restartConn) {
            await restartConnHard();
        } else {
            detachAllEvents();
        }
        attachAllEvents();
        isInit = false;
        return true;
    };

    const pluginFolder = global.__dirname(
        join(global.__dirname(import.meta.url), "./plugins/index")
    );

    async function getAllPlugins(dir) {
        const results = [];
        try {
            const files = await readdir(dir);
            for (const file of files) {
                const filepath = join(dir, file);
                const stats = await stat(filepath);
                if (stats.isDirectory()) results.push(...(await getAllPlugins(filepath)));
                else if (/\.js$/.test(file)) results.push(filepath);
            }
        } catch (err) {
            console.error("Failed to read plugin folder:", err.message);
        }
        return results;
    }

    await initReload(conn, pluginFolder, getAllPlugins);
    initCron();
    await global.reloadHandler();
}

IZUMI();