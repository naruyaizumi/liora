/* global conn */
import path, { join } from "path";
import { access } from "fs/promises";
import { watch } from "fs";
import { schedule } from "../src/bridge.js";
import chalk from "chalk";
import { DisconnectReason } from "baileys";
import { checkGempa, clearTmp } from "./schedule.js";

async function connectionUpdateHandler(update) {
    const { connection, lastDisconnect, isNewLogin } = update;

    if (isNewLogin) conn.isInit = true;

    switch (connection) {
        case "connecting":
            console.log(chalk.gray("Connecting..."));
            break;
        case "open":
            console.log(chalk.green("Connected to WhatsApp."));
            break;
        case "close":
            console.log(chalk.red("Connection closed — reconnecting..."));
            break;
    }

    if (lastDisconnect?.error) {
        const { statusCode } = lastDisconnect.error.output || {};
        if (statusCode !== DisconnectReason.loggedOut) {
            setTimeout(async () => {
                try {
                    await global.reloadHandler(true);
                    console.log(chalk.yellow("Session reloaded after disconnect"));
                } catch (err) {
                    console.error(chalk.red("ReloadHandler failed:"), err);
                }
            }, 1000);
        }
    }

    global.timestamp.connect = new Date();
}

async function initReload(conn, pluginFolder, getAllPlugins) {
    const pluginFilter = (filename) => /\.js$/.test(filename);
    global.plugins = {};

    async function loadPlugins() {
        let success = 0,
            failed = 0;
        const files = await Promise.resolve(getAllPlugins(pluginFolder));

        for (const filepath of files) {
            const filename = path.relative(pluginFolder, filepath);
            try {
                const file = global.__filename(filepath);
                const module = await import(file);
                global.plugins[filename] = module.default || module;
                success++;
            } catch {
                delete global.plugins[filename];
                failed++;
            }
        }
        conn.logger.info(`Plugins loaded: ${success} OK, ${failed} failed.`);
    }

    await loadPlugins().catch(console.error);

    global.reload = async (_ev, filename) => {
        if (!pluginFilter(filename)) return;
        const dir = global.__filename(join(pluginFolder, filename), true);

        try {
            await access(dir);
        } catch {
            delete global.plugins[filename];
            conn.logger.info(`Plugin removed: ${filename}`);
            return;
        }

        try {
            const module = await import(`${global.__filename(dir)}?update=${Date.now()}`);
            global.plugins[filename] = module.default || module;
            conn.logger.info(chalk.green(`Reloaded: ${filename}`));
        } catch (err) {
            conn.logger.warn(chalk.red(`Reload error in '${filename}': ${err.message}`));
        }
    };

    Object.freeze(global.reload);

    let pending = false;
    let lastChange = 0;
    let lastFile = null;
    const debounce = 1000;

    schedule(
        "pluginWatcherDebounce",
        async () => {
            if (!pending || !lastFile) return;
            if (Date.now() - lastChange >= debounce) {
                pending = false;
                await global
                    .reload(null, lastFile)
                    .catch((e) =>
                        conn.logger.warn(`Debounced reload failed: ${e.message}`)
                    );
            }
        },
        { intervalSeconds: 1 }
    );

    watch(pluginFolder, { recursive: true }, (_event, filename) => {
        if (!filename || !pluginFilter(filename)) return;
        lastFile = filename;
        lastChange = Date.now();
        pending = true;
    });
}

function initCron() {
    schedule("reset", async () => clearTmp(), { cron: "0 0 * * *" });
    schedule("feeds", async () => checkGempa(), { intervalSeconds: 15 });
}

export { connectionUpdateHandler, initReload, initCron };
