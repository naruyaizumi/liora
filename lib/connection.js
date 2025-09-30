/* global conn */
import path, { join } from "path";
import { existsSync, readFileSync, watch } from "fs";
import syntaxerror from "syntax-error";
import { format } from "util";
import { schedule } from "./cron.js";
import chalk from "chalk";
import { DisconnectReason } from "baileys";
import {
    checkGempa,
    clearTmp,
    resetCommand,
} from "./schedule.js";

async function connectionUpdateHandler(update) {
    const { receivedPendingNotifications, connection, lastDisconnect, isOnline, isNewLogin } =
        update;
    if (isNewLogin) conn.isInit = true;
    if (connection === "connecting")
        console.log(chalk.yellow.bold("🚀  Activating, please wait a moment"));
    if (connection === "open")
        console.log(chalk.cyan.bold("⚡  Connected! Successfully activated."));
    if (isOnline === false) {
        console.log(chalk.redBright.bold("🔴  Status: Disconnected!"));
        console.log(chalk.red.bold("❌  Connection to WhatsApp has been lost."));
        console.log(chalk.red.bold("🚀  Trying to reconnect"));
    }
    if (receivedPendingNotifications)
        console.log(chalk.cyan.bold("📩  Status: Waiting for new messages"));
    if (connection === "close") {
        console.log(chalk.redBright.bold("⚠️  Connection Closed!"));
        console.log(chalk.red.bold("📡  Attempting to reconnect"));
    }

    global.timestamp.connect = new Date();

    if (lastDisconnect && lastDisconnect.error) {
        const { statusCode } = lastDisconnect.error.output || {};
        if (statusCode !== DisconnectReason.loggedOut) {
            await global.reloadHandler(true);
            console.log(chalk.redBright.bold("🔌 Connecting"));
        }
    }

    if (global.db.data == null) await global.loadDatabase();
}

async function initReload(conn, pluginFolder, getAllPlugins) {
    const pluginFilter = (filename) => /\.js$/.test(filename);
    global.plugins = {};

    async function filesInit() {
        let success = 0;
        let failed = 0;
        for (let filepath of getAllPlugins(pluginFolder)) {
            let filename = path.relative(pluginFolder, filepath);
            try {
                let file = global.__filename(filepath);
                const module = await import(file);
                global.plugins[filename] = module.default || module;
                success++;
            } catch {
                delete global.plugins[filename];
                failed++;
            }
        }
        conn.logger.info(`🍩 Total plugins loaded: ${success}, failed: ${failed}`);
    }

    await filesInit().catch(console.error);

    global.reload = async (_ev, filename) => {
        if (pluginFilter(filename)) {
            let dir = global.__filename(join(pluginFolder, filename), true);
            if (filename in global.plugins) {
                if (existsSync(dir)) conn.logger.info(`🍰 Reloading plugin '${filename}'`);
                else {
                    conn.logger.warn(`🍪 Plugin '${filename}' has been removed`);
                    return delete global.plugins[filename];
                }
            } else conn.logger.info(`🧁 Loading new plugin: '${filename}'`);
            let err = syntaxerror(readFileSync(dir), filename, {
                sourceType: "module",
                allowAwaitOutsideFunction: true,
            });
            if (err) {
                conn.logger.error(
                    [
                        `🍬 Plugin Error: '${filename}'`,
                        `🍫 Message: ${err.message}`,
                        `🍩 Line: ${err.line}, Column: ${err.column}`,
                        `🍓 ${err.annotated}`,
                    ].join("\n")
                );
                return;
            }
            try {
                const module = await import(`${global.__filename(dir)}?update=${Date.now()}`);
                global.plugins[filename] = module.default || module;
            } catch (e) {
                conn.logger.error(`🍪 Error while loading plugin '${filename}'\n${format(e)}`);
            } finally {
                global.plugins = Object.fromEntries(
                    Object.entries(global.plugins).sort(([a], [b]) => a.localeCompare(b))
                );
            }
        }
    };

    Object.freeze(global.reload);
    watch(pluginFolder, { recursive: true }, global.reload);
}

function initCron() {
    schedule(
        "reset",
        async () => {
            await resetCommand();
            await clearTmp();
        },
        { cron: "0 0 * * *" }
    );
    schedule(
        "feeds",
        async () => {
            await checkGempa();
        },
        { intervalSeconds: 10 }
    );
}

export { connectionUpdateHandler, initReload, initCron };