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
        logger: P({ level: "silent" }),
        printQRInTerminal: !pairingAuth,
        browser: Browsers.ubuntu("Safari"),
        emitOwnEvents: true,
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
            const oldChats = global.conn?.chats || {};
            try {
                global.conn.ws?.close();
            } catch {
                /* ignore */
            }
            conn.ev.removeAllListeners();
            global.conn = naruyaizumi(connectionOptions, { chats: oldChats });
            isInit = true;
        }

        if (!isInit && conn.ev) {
            for (const [ev, fn] of [
                ["messages.upsert", conn.handler],
                ["group-participants.update", conn.participantsUpdate],
                ["message.delete", conn.onDelete],
                ["connection.update", conn.connectionUpdate],
                ["creds.update", conn.credsUpdate],
            ]) {
                if (typeof fn === "function") conn.ev.off(ev, fn);
            }
        }

        conn.handler = handler?.handler?.bind(global.conn) || (() => {});
        conn.participantsUpdate = handler?.participantsUpdate?.bind(global.conn) || (() => {});
        conn.onDelete = handler?.deleteUpdate?.bind(global.conn) || (() => {});
        conn.connectionUpdate = connectionUpdateHandler?.bind(global.conn) || (() => {});
        conn.credsUpdate = saveCreds?.bind(global.conn) || (() => {});

        if (conn.ev) {
            if (typeof conn.handler === "function") conn.ev.on("messages.upsert", conn.handler);
            if (typeof conn.participantsUpdate === "function")
                conn.ev.on("group-participants.update", conn.participantsUpdate);
            if (typeof conn.onDelete === "function") conn.ev.on("message.delete", conn.onDelete);
            if (typeof conn.connectionUpdate === "function")
                conn.ev.on("connection.update", conn.connectionUpdate);
            if (typeof conn.credsUpdate === "function")
                conn.ev.on("creds.update", conn.credsUpdate);
        }

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
