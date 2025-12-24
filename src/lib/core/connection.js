import { readdir, stat, access } from "fs/promises";
import { join, relative, normalize } from "path";
import chokidar from "chokidar";
import { naruyaizumi } from "./socket.js";

export class PluginCache {
    constructor(ttl = 5000) {
        this.cache = null;
        this.cacheTime = 0;
        this.ttl = ttl;
    }

    isValid() {
        return this.cache && Date.now() - this.cacheTime < this.ttl;
    }

    get() {
        return this.isValid() ? this.cache : null;
    }

    set(plugins) {
        this.cache = plugins;
        this.cacheTime = Date.now();
    }

    clear() {
        this.cache = null;
        this.cacheTime = 0;
    }
}

export async function getAllPlugins(dir, cacheManager, skipCache = false) {
    if (!skipCache) {
        const cached = cacheManager.get();
        if (cached) return cached;
    }

    const results = [];

    try {
        const files = await readdir(dir);

        for (const file of files) {
            const filepath = join(dir, file);

            try {
                const stats = await stat(filepath);

                if (stats.isDirectory()) {
                    const nested = await getAllPlugins(filepath, cacheManager, true);
                    results.push(...nested);
                } else if (file.endsWith(".js")) {
                    results.push(filepath);
                }
            } catch {
                //
            }
        }
    } catch (e) {
        global.logger?.error?.({ error: e.message }, "Error reading plugin directory");
    }

    cacheManager.set(results);
    return results;
}

export async function loadPlugins(pluginFolder, getAllPluginsFn) {
    let success = 0, failed = 0;
    global.plugins = {};

    try {
        const files = await getAllPluginsFn(pluginFolder);

        for (const filepath of files) {
            const filename = normalize(relative(pluginFolder, filepath)).replace(/\\/g, "/");
            
            try {
                const module = await import(`${filepath}?init=${Date.now()}`);
                global.plugins[filename] = module.default || module;
                success++;
            } catch (e) {
                delete global.plugins[filename];
                failed++;
                global.logger?.warn?.({ file: filename, error: e.message }, "Failed to load plugin");
            }
        }

        global.logger?.info?.(`Plugins loaded: ${success} OK, ${failed} failed`);
    } catch (e) {
        global.logger?.error?.({ error: e.message }, "Error loading plugins");
        throw e;
    }
}

const IGNORED_PATTERNS = [
    /(^|[\/\\])\../,
    /node_modules/,
    /\.db$/,
    /\.cpp$/,
    /\.h$/,
    /\.c$/,
    /package\.json$/,
    /package-lock\.json$/,
    /yarn\.lock$/,
    /pnpm-lock\.yaml$/,
    /\.git/,
    /\.log$/,
    /\.tmp$/,
];

const MAX_RELOAD_ATTEMPTS = 3;
const RELOAD_TIMEOUT = 5000;

export function initHotReload(watchPath, onReload) {
    const reloadLocks = new Map();
    const failedReloads = new Map();
    let reloadCounter = 0;
    let isClosed = false;

    async function reloadFile(filepath) {
        if (isClosed) return;

        const filename = normalize(relative(watchPath, filepath)).replace(/\\/g, "/");

        if (!filename.endsWith(".js")) return;

        if (reloadLocks.has(filename)) {
            return reloadLocks.get(filename);
        }

        const failCount = failedReloads.get(filename) || 0;
        if (failCount >= MAX_RELOAD_ATTEMPTS) {
            global.logger?.warn?.(
                { file: filename, attempts: failCount },
                "Max reload attempts reached, skipping"
            );
            return;
        }

        const reloadPromise = (async () => {
            const timeoutId = setTimeout(() => {
                global.logger?.warn?.(
                    { file: filename },
                    "Reload taking too long, may have issues"
                );
            }, RELOAD_TIMEOUT);

            try {
                try {
                    await access(filepath);
                } catch {
                    clearTimeout(timeoutId);
                    await onReload(filename, null);
                    failedReloads.delete(filename);
                    global.logger?.info?.({ file: filename }, "File removed");
                    return;
                }

                const cacheKey = `${Date.now()}-${++reloadCounter}`;
                const module = await import(`${filepath}?v=${cacheKey}`);

                if (!module || (typeof module !== 'object' && typeof module !== 'function')) {
                    throw new Error("Invalid module export");
                }

                await Promise.race([
                    onReload(filename, module.default || module),
                    new Promise((_, reject) => 
                        setTimeout(() => reject(new Error("Reload timeout")), RELOAD_TIMEOUT)
                    )
                ]);

                clearTimeout(timeoutId);
                failedReloads.delete(filename);
                global.logger?.info?.({ file: filename }, "File reloaded");
            } catch (e) {
                clearTimeout(timeoutId);
                
                const newFailCount = failCount + 1;
                failedReloads.set(filename, newFailCount);

                global.logger?.error?.(
                    { 
                        file: filename, 
                        error: e.message,
                        stack: e.stack,
                        attempts: newFailCount
                    },
                    "Reload failed"
                );

            } finally {
                setTimeout(() => reloadLocks.delete(filename), 1000);
            }
        })();

        reloadLocks.set(filename, reloadPromise);
        return reloadPromise;
    }

    const debounceTimers = new Map();
    const debouncedReload = (filepath) => {
        if (isClosed) return;

        const filename = normalize(relative(watchPath, filepath)).replace(/\\/g, "/");

        if (!filename.endsWith(".js")) return;

        const existingTimer = debounceTimers.get(filename);
        if (existingTimer) {
            clearTimeout(existingTimer);
        }

        const timer = setTimeout(() => {
            debounceTimers.delete(filename);
            reloadFile(filepath).catch(e => {
                global.logger?.debug?.({ error: e.message }, "Debounced reload error");
            });
        }, 500);

        debounceTimers.set(filename, timer);
    };

    let watcher = null;

    try {
        watcher = chokidar.watch(watchPath, {
            ignored: IGNORED_PATTERNS,
            persistent: true,
            ignoreInitial: true,
            awaitWriteFinish: {
                stabilityThreshold: 500,
                pollInterval: 100,
            },
            depth: 99,
            usePolling: false,
            atomic: true,
            ignorePermissionErrors: true,
        });

        watcher
            .on("change", debouncedReload)
            .on("add", debouncedReload)
            .on("unlink", (filepath) => {
                if (isClosed) return;

                const filename = normalize(relative(watchPath, filepath)).replace(/\\/g, "/");
                if (filename.endsWith(".js")) {
                    onReload(filename, null).catch(e => {
                        global.logger?.error?.({ error: e.message }, "Unlink error");
                    });
                }
            })
            .on("error", (e) => {
                if (!isClosed) {
                    global.logger?.error?.({ error: e.message }, "Watcher error");
                }
            });

        global.logger?.info?.("Hot reload initialized");
    } catch (e) {
        global.logger?.error?.({ error: e.message }, "Failed to initialize watcher");
        throw e;
    }

    return () => {
        isClosed = true;

        if (watcher) {
            try {
                watcher.close();
            } catch (e) {
                global.logger?.error?.({ error: e.message }, "Watcher close error");
            }
        }

        debounceTimers.forEach(timer => clearTimeout(timer));
        debounceTimers.clear();
        reloadLocks.clear();
        failedReloads.clear();

        global.logger?.info?.("Hot reload stopped");
    };
}

export class EventManager {
    constructor() {
        this.handlers = new Map();
        this.isInit = true;
        this.currentHandler = null;
    }

    setHandler(handler) {
        this.currentHandler = handler;
    }

    register(conn, handler, saveCreds) {
        const messageHandler = handler?.handler?.bind(conn) || (() => {});
        const credsHandler = saveCreds?.bind(conn) || (() => {});

        conn.handler = messageHandler;
        conn.credsUpdate = credsHandler;

        if (conn?.ev) {
            conn.ev.on("messages.upsert", messageHandler);
            conn.ev.on("creds.update", credsHandler);

            this.handlers.set("messages.upsert", messageHandler);
            this.handlers.set("creds.update", credsHandler);
        }
    }

    unregister(conn) {
        if (!this.isInit && conn?.ev) {
            for (const [event, handler] of this.handlers) {
                try {
                    conn.ev.off(event, handler);
                } catch (e) {
                    global.logger?.error?.(
                        { error: e.message, event },
                        "Failed to unregister handler"
                    );
                }
            }
            this.handlers.clear();
        }
    }

    async createReloadHandler(connectionOptions, saveCreds) {
        const self = this;
        const handlerPath = join(process.cwd(), "./src/handler.js");

        return async function (restartConn = false) {
            let handler = self.currentHandler;

            try {
                const module = await import(`${handlerPath}?update=${Date.now()}`);
                if (module && typeof module.handler === "function") {
                    handler = module;
                    self.setHandler(handler);
                }
            } catch (e) {
                global.logger?.error?.({ error: e.message }, "Handler reload error");
            }

            if (!handler) return false;

            if (restartConn) {
                const oldChats = global.conn?.chats || {};

                try {
                    if (global.conn?.ev) {
                        global.conn.ev.removeAllListeners();
                    }

                    if (global.conn?.ws) {
                        global.conn.ws.close();
                    }

                    global.conn = null;
                    await new Promise(r => setTimeout(r, 100));
                } catch (e) {
                    global.logger?.error?.({ error: e.message }, "Restart error");
                }

                global.conn = naruyaizumi(connectionOptions, { chats: oldChats });
                self.isInit = true;
            }

            self.unregister(global.conn);
            self.register(global.conn, handler, saveCreds);

            self.isInit = false;
            return true;
        };
    }
}

const RECONNECT_STATE = {
    attempts: 0,
    lastAt: 0,
    cooldownUntil: 0,
    inflight: false,
    timer: null,
};

const backoff = (baseMs, factor = 1.8, maxMs = 60_000) => {
    const n = Math.max(0, RECONNECT_STATE.attempts - 1);
    const raw = Math.min(maxMs, Math.round(baseMs * Math.pow(factor, n)));
    const jitter = raw * (0.2 + Math.random() * 0.3);
    return Math.max(500, raw + Math.round((Math.random() < 0.5 ? -1 : 1) * jitter));
};

const getDisconnectReason = (error) => {
    const code = String(
        error?.output?.statusCode ??
        error?.statusCode ??
        error?.code ??
        0
    ).toUpperCase();

    const reasons = {
        "428": "replaced_by_another_session",
        "515": "connection_replaced",
    };

    if (reasons[code]) return reasons[code];

    const msg = (error?.message || "").toLowerCase();
    if (msg.includes("logged out")) return "logged_out";
    if (msg.includes("replaced")) return "connection_replaced";
    if (msg.includes("unpaired")) return "device_unpaired";
    if (msg.includes("timeout")) return "timeout";
    if (msg.includes("unavailable")) return "server_unavailable";

    return "unknown";
};

const getBaseDelay = (reason) => {
    switch (reason) {
        case "logged_out":
        case "device_unpaired":
        case "pairing_required":
            return null;
        case "timeout":
        case "server_unavailable":
            return 6_000;
        default:
            return 2_000;
    }
};

export async function handleDisconnect({ lastDisconnect, connection, isNewLogin }) {
    const reason = getDisconnectReason(lastDisconnect?.error);

    if (isNewLogin) {
        global.conn.isInit = true;
    }

    switch (connection) {
        case "connecting":
            global.logger?.info?.("Connecting…");
            break;
        case "open":
            global.logger?.info?.("Connected to WhatsApp");
            RECONNECT_STATE.attempts = 0;
            RECONNECT_STATE.cooldownUntil = 0;
            break;
        case "close":
            global.logger?.warn?.(`Connection closed — reason=${reason}`);
            break;
    }

    if (!lastDisconnect?.error) return;

    const baseDelay = getBaseDelay(reason);

    if (baseDelay === null) {
        global.logger?.error?.(`Session requires manual fix (${reason})`);
        return;
    }

    if (Date.now() < RECONNECT_STATE.cooldownUntil) {
        return;
    }

    if (RECONNECT_STATE.inflight) return;

    if (RECONNECT_STATE.attempts >= 6) {
        RECONNECT_STATE.cooldownUntil = Date.now() + 5 * 60_000;
        RECONNECT_STATE.attempts = 0;
        global.logger?.warn?.("Too many failures; entering 5m cooldown");
        return;
    }

    const delay = backoff(baseDelay);

    RECONNECT_STATE.inflight = true;
    RECONNECT_STATE.timer = setTimeout(async () => {
        RECONNECT_STATE.timer = null;

        try {
            await new Promise(r => setTimeout(r, 200));
            await global.reloadHandler(true);

            RECONNECT_STATE.attempts += 1;
            RECONNECT_STATE.lastAt = Date.now();

            global.logger?.info?.(
                `Reconnected (attempt ${RECONNECT_STATE.attempts})`
            );
        } catch (e) {
            global.logger?.error?.({ error: e.message }, "Reconnect failed");
            RECONNECT_STATE.attempts += 1;
        } finally {
            RECONNECT_STATE.inflight = false;
        }
    }, delay);

    global.logger?.warn?.(`Reconnecting in ${Math.ceil(delay / 1000)}s`);
}

export function cleanupReconnect() {
    if (RECONNECT_STATE.timer) {
        clearTimeout(RECONNECT_STATE.timer);
        RECONNECT_STATE.timer = null;
    }
    RECONNECT_STATE.attempts = 0;
    RECONNECT_STATE.cooldownUntil = 0;
    RECONNECT_STATE.inflight = false;
}