import path, { join } from "path";
import { access } from "fs/promises";
import chokidar from "chokidar";

async function initReload(conn, pluginFolder, getAllPlugins) {
    const pluginFilter = (filename) => /\.js$/.test(filename);

    global.plugins = {};
    const cleanupFunctions = [];

    const normalizePath = (filepath) => {
        return path.normalize(filepath).replace(/\\/g, "/");
    };

    async function loadPlugins() {
        let success = 0,
            failed = 0;

        try {
            const files = await getAllPlugins(pluginFolder);

            for (const filepath of files) {
                const filename = normalizePath(path.relative(pluginFolder, filepath));
                try {
                    const file = global.__filename(filepath);
                    const module = await import(`${file}?init=${Date.now()}`);

                    global.plugins[filename] = module.default || module;
                    success++;
                } catch (e) {
                    delete global.plugins[filename];
                    failed++;
                    conn.logger.warn(`Failed to load plugin '${filename}': ${e.message}`);
                }
            }

            conn.logger.info(`Plugins loaded: ${success} OK, ${failed} failed.`);
        } catch (e) {
            conn.logger.error(e.message);
            throw e;
        }
    }

    await loadPlugins().catch(conn.logger.error);

    const reloadLocks = new Map();
    let reloadCounter = 0;

    global.reload = async (_ev, filename) => {
        if (!pluginFilter(filename)) return;

        if (reloadLocks.has(filename)) {
            conn.logger.debug(`Already reloading, waiting: ${filename}`);
            return reloadLocks.get(filename);
        }

        const reloadPromise = (async () => {
            conn.logger.info(`Reloading: ${filename} (PID: ${process.pid})`);

            try {
                const dir = global.__filename(join(pluginFolder, filename), true);

                try {
                    await access(dir);
                } catch {
                    delete global.plugins[filename];
                    conn.logger.info(`Plugin removed: ${filename}`);
                    return;
                }

                const modulePath = global.__filename(dir);
                const cacheKey = `${Date.now()}-${++reloadCounter}`;
                const module = await import(`${modulePath}?v=${cacheKey}`);

                global.plugins[filename] = module.default || module;
                conn.logger.info(`Reloaded: ${filename}`);
            } catch (e) {
                conn.logger.error(`Reload failed for ${filename}: ${e.message}`);
                conn.logger.error(e.stack);
            } finally {
                setTimeout(() => {
                    reloadLocks.delete(filename);
                }, 1000);
            }
        })();

        reloadLocks.set(filename, reloadPromise);

        return reloadPromise;
    };

    Object.freeze(global.reload);

    const debounceTimers = new Map();
    const lastEventTime = new Map();
    const debounceDelay = 500;

    const debouncedReload = (filepath) => {
        const filename = normalizePath(path.relative(pluginFolder, filepath));

        if (!pluginFilter(filename)) return;

        const now = Date.now();
        const lastTime = lastEventTime.get(filename) || 0;
        if (now - lastTime < 100) {
            conn.logger.debug(`Ignoring rapid duplicate event: ${filename}`);
            return;
        }

        lastEventTime.set(filename, now);

        if (debounceTimers.has(filename)) {
            clearTimeout(debounceTimers.get(filename));
        }

        const timer = setTimeout(async () => {
            debounceTimers.delete(filename);

            try {
                await global.reload(null, filename);
            } catch (e) {
                conn.logger.error(e.message);
            }
        }, debounceDelay);

        debounceTimers.set(filename, timer);
    };

    try {
        let eventCount = 0;
        const eventLog = new Map();

        const logEvent = (type, filepath) => {
            const filename = normalizePath(path.relative(pluginFolder, filepath));
            const now = Date.now();

            if (!eventLog.has(filename)) {
                eventLog.set(filename, []);
            }

            const events = eventLog.get(filename);
            events.push({ type, time: now, id: ++eventCount });

            if (events.length > 10) {
                events.shift();
            }

            const recentEvents = events.filter((e) => now - e.time < 1000);
            if (recentEvents.length > 3) {
                conn.logger.warn(
                    `Multiple events detected for ${filename}: ${recentEvents.map((e) => e.type).join(", ")}`
                );
            }

            conn.logger.debug(`[${type}] ${filename} (event #${eventCount})`);
        };

        const watcher = chokidar.watch(pluginFolder, {
            ignored: /(^|[\\/])\../,
            persistent: true,
            ignoreInitial: true,
            awaitWriteFinish: {
                stabilityThreshold: 500,
                pollInterval: 100,
            },
            depth: 99,
            usePolling: false,
            atomic: true,
            followSymlinks: false,
            ignorePermissionErrors: true,
        });

        watcher
            .on("change", (filepath) => {
                logEvent("CHANGE", filepath);
                debouncedReload(filepath);
            })
            .on("add", (filepath) => {
                logEvent("ADD", filepath);
                debouncedReload(filepath);
            })
            .on("unlink", (filepath) => {
                const filename = normalizePath(path.relative(pluginFolder, filepath));
                if (!pluginFilter(filename)) return;

                logEvent("UNLINK", filepath);
                delete global.plugins[filename];
                conn.logger.info(`Plugin removed: ${filename}`);
            })
            .on("error", (e) => {
                conn.logger.error(e.message);
            })
            .on("ready", () => {
                conn.logger.info(`Watching plugins folder: ${pluginFolder}`);
            });

        cleanupFunctions.push(() => {
            if (watcher) {
                watcher.close();
            }
            debounceTimers.forEach((timer) => clearTimeout(timer));
            debounceTimers.clear();
            reloadLocks.clear();
            lastEventTime.clear();
            eventLog.clear();
        });
    } catch (e) {
        conn.logger.error(e.message);
    }

    return () => {
        cleanupFunctions.forEach((cleanup) => cleanup());
    };
}

export { initReload };
