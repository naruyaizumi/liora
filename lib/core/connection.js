/* global conn */
import "#global";
import "#config";
import { readdir, stat, access } from "fs/promises";
import path, { join, normalize, relative } from "path";
import { naruyaizumi } from "#socket";
import chokidar from "chokidar";
import pino from "pino";
import { Browsers } from "naruyaizumi";

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

export class BaileysVersion {
    constructor() {
        this.version = null;
        this.lastFetch = 0;
        this.cacheTTL = 3600000;
        this.versionUrl = "https://raw.githubusercontent.com/WhiskeySockets/Baileys/refs/heads/master/src/Defaults/baileys-version.json";
    }

    async fetchVersion() {
        const now = Date.now();

        if (this.version && (now - this.lastFetch) < this.cacheTTL) {
            return this.version;
        }

        try {
            const response = await fetch(this.versionUrl, {
                method: "GET",
                headers: {
                    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 15_7_2) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Safari/605.1.15"
                },
                signal: AbortSignal.timeout(10000)
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const data = await response.json();

            if (!data || !Array.isArray(data.version) || data.version.length !== 3) {
                throw new Error("Invalid version format");
            }

            this.version = data.version;
            this.lastFetch = now;

            return this.version;
        } catch (e) {
            logger.warn({ error: e.message }, "Failed to fetch version, using fallback");
            this.version = [2, 3000, 1027934701];
            return this.version;
        }
    }
}

export class PluginCache {
    constructor(ttl = 5000) {
        this.cache = null;
        this.cacheTime = 0;
        this.ttl = ttl;
    }

    isValid() {
        return this.cache && (Date.now() - this.cacheTime) < this.ttl;
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
        
        const filePromises = files.map(async (file) => {
            const filepath = join(dir, file);
            
            try {
                const stats = await stat(filepath);
                
                if (stats.isDirectory()) {
                    return await getAllPlugins(filepath, cacheManager, true);
                } else if (file.endsWith(".js")) {
                    return [filepath];
                }
                
                return [];
            } catch {
                return [];
            }
        });

        const nestedResults = await Promise.all(filePromises);
        results.push(...nestedResults.flat());
    } catch (e) {
        logger.error({ error: e.message }, "Error reading plugin directory");
    }

    cacheManager.set(results);
    return results;
}

export async function initReload(conn, pluginFolder, getAllPlugins) {
    const pluginFilter = (filename) => /\.js$/.test(filename);

    global.plugins = {};
    const cleanupFunctions = [];

    const normalizePath = (filepath) => {
        return normalize(filepath).replace(/\\/g, "/");
    };

    async function loadPlugins() {
        let success = 0, failed = 0;

        try {
            const files = await getAllPlugins(pluginFolder);

            for (const filepath of files) {
                const filename = normalizePath(relative(pluginFolder, filepath));
                try {
                    const module = await import(`${filepath}?init=${Date.now()}`);

                    global.plugins[filename] = module.default || module;
                    success++;
                } catch (e) {
                    delete global.plugins[filename];
                    failed++;
                    logger.warn({ file: filename, error: e.message }, "Failed to load plugin");
                }
            }

            conn.logger.info(`Plugins loaded: ${success} OK, ${failed} failed.`);
        } catch (e) {
            logger.error({ error: e.message }, "Error loading plugins");
            throw e;
        }
    }

    await loadPlugins();

    const reloadLocks = new Map();
    let reloadCounter = 0;

    global.reload = async (_ev, filename) => {
        if (!pluginFilter(filename)) return;

        if (reloadLocks.has(filename)) {
            return reloadLocks.get(filename);
        }

        const reloadPromise = (async () => {
            try {
                const dir = path.join(pluginFolder, filename);

                try {
                    await access(dir);
                } catch {
                    delete global.plugins[filename];
                    logger.info({ plugin: filename }, "Plugin removed");
                    return;
                }

                const modulePath = dir;
                const cacheKey = `${Date.now()}-${++reloadCounter}`;
                const module = await import(`${modulePath}?v=${cacheKey}`);

                global.plugins[filename] = module.default || module;
                logger.info({ plugin: filename }, "Plugin reloaded");
            } catch (e) {
                logger.error({ plugin: filename, error: e.message, stack: e.stack }, "Reload failed");
            } finally {
                setTimeout(() => reloadLocks.delete(filename), 1000);
            }
        })();

        reloadLocks.set(filename, reloadPromise);
        return reloadPromise;
    };

    Object.freeze(global.reload);

    const debounceTimers = new Map();
    const lastEventTime = new Map();
    const debounceDelay = 500;
    const EVENT_TIME_CLEANUP_INTERVAL = 300000;
    const cleanupTimer = setInterval(() => {
        const now = Date.now();
        const staleThreshold = 60000;
        
        for (const [filename, timestamp] of lastEventTime.entries()) {
            if (now - timestamp > staleThreshold) {
                lastEventTime.delete(filename);
            }
        }
    }, EVENT_TIME_CLEANUP_INTERVAL);

    cleanupFunctions.push(() => clearInterval(cleanupTimer));

    const debouncedReload = (filepath) => {
        const filename = normalizePath(relative(pluginFolder, filepath));

        if (!pluginFilter(filename)) return;

        const now = Date.now();
        const lastTime = lastEventTime.get(filename) || 0;
        if (now - lastTime < 100) return;

        lastEventTime.set(filename, now);

        if (debounceTimers.has(filename)) {
            clearTimeout(debounceTimers.get(filename));
        }

        const timer = setTimeout(async () => {
            debounceTimers.delete(filename);
            try {
                await global.reload(null, filename);
            } catch (e) {
                logger.error({ error: e.message }, "Reload error");
            }
        }, debounceDelay);

        debounceTimers.set(filename, timer);
    };

    try {
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
            .on("change", debouncedReload)
            .on("add", debouncedReload)
            .on("unlink", (filepath) => {
                const filename = normalizePath(relative(pluginFolder, filepath));
                if (!pluginFilter(filename)) return;
                delete global.plugins[filename];
                logger.info({ plugin: filename }, "Plugin removed");
            })
            .on("error", (e) => logger.error({ error: e.message }, "Watcher error"));

        cleanupFunctions.push(() => {
            if (watcher) watcher.close();
            debounceTimers.forEach((timer) => clearTimeout(timer));
            debounceTimers.clear();
            reloadLocks.clear();
            lastEventTime.clear();
        });
    } catch (e) {
        logger.error({ error: e.message }, "Watcher setup error");
    }

    return () => cleanupFunctions.forEach((cleanup) => cleanup());
}

export function createConnection(baileysVersion, auth, baileyLogger) {
    return {
        version: baileysVersion,
        logger: baileyLogger,
        browser: Browsers.macOS("Safari"),
        auth: auth.state,
        getMessage: async (key) => {
            if (!global.conn || typeof global.conn.loadMessage !== 'function') {
                return null;
            }
            try {
                return await global.conn.loadMessage(key.id);
            } catch (e) {
                logger.error({ error: e.message }, "Failed to load message");
                return null;
            }
        },
        printQRInTerminal: false,
        defaultQueryTimeoutMs: 60000,
        connectTimeoutMs: 60000,
        keepAliveIntervalMs: 10000,
        emitOwnEvents: true,
        fireInitQueries: true,
        generateHighQualityLinkPreview: true,
        syncFullHistory: true,
        markOnlineOnConnect: true,
        retryRequestDelayMs: 250,
        maxMsgRetryCount: 5,
        appStateMacVerification: {
            patch: true,
            snapshot: true
        },
        linkPreviewImageThumbnailWidth: 192,
        transactionOpts: {
            maxCommitRetries: 5,
            delayBetweenTriesMs: 2500
        },
        enableAutoSessionRecreation: true,
        enableRecentMessageCache: true,
        shouldIgnoreJid: (jid) => {
            if (!jid) return true;
            return jid.endsWith("@broadcast") || jid.startsWith("status@broadcast");
        },
        shouldSyncHistoryMessage: (msg) => {
            return true;
        },
        patchMessageBeforeSending: (msg, recipientJids) => {
            return msg;
        },
    };
}

export async function handleDisconnect({ lastDisconnect, isNewLogin, connection }) {
    global.__reconnect ??= {
        attempts: 0,
        lastAt: 0,
        cooldownUntil: 0,
        inflight: false,
        timer: null,
        keepAliveTimer: null,
    };

    const backoff = (baseMs, factor = 1.8, maxMs = 60_000) => {
        const n = Math.max(0, global.__reconnect.attempts - 1);
        const raw = Math.min(maxMs, Math.round(baseMs * Math.pow(factor, n)));
        const jitter = raw * (0.2 + Math.random() * 0.3);
        return Math.max(500, raw + Math.round((Math.random() < 0.5 ? -1 : 1) * jitter));
    };

    const dcReason = (() => {
        const e = lastDisconnect?.error;
        const raw =
            e?.output?.statusCode ??
            e?.statusCode ??
            e?.code ??
            e?.errno ??
            (typeof e?.message === "string" && e.message.match(/\b\d{3,4}\b/)?.[0]) ??
            0;

        const code = String(raw).toUpperCase();
        switch (code) {
            case "1000":
                return "normal_closure";
            case "1001":
                return "server_going_away";
            case "1002":
                return "protocol_error";
            case "1003":
                return "unsupported_data";
            case "1005":
                return "no_status_received";
            case "1006":
                return "abnormal_closure";
            case "1007":
                return "invalid_frame_payload";
            case "1008":
                return "policy_violation";
            case "1009":
                return "message_too_big";
            case "1010":
                return "mandatory_extension";
            case "1011":
                return "internal_error";
            case "1012":
                return "service_restart";
            case "1013":
                return "try_again_later";
            case "1014":
                return "bad_gateway";
            case "1015":
                return "tls_handshake_failure";
            case "400":
                return "bad_request";
            case "401":
                return "unauthorized";
            case "403":
                return "forbidden";
            case "404":
                return "not_found";
            case "405":
                return "method_not_allowed";
            case "408":
                return "request_timeout";
            case "409":
                return "conflict";
            case "410":
                return "gone";
            case "412":
                return "precondition_failed";
            case "413":
                return "payload_too_large";
            case "415":
                return "unsupported_media_type";
            case "418":
                return "i_am_a_teapot";
            case "421":
                return "misdirected_request";
            case "425":
                return "too_early";
            case "426":
                return "upgrade_required";
            case "428":
                return "replaced_by_another_session";
            case "429":
                return "rate_limited";
            case "440":
                return "multi_device_migration";
            case "460":
                return "pairing_required";
            case "463":
                return "device_removed";
            case "470":
                return "bad_provisioning";
            case "471":
                return "stale_session";
            case "472":
                return "stale_socket";
            case "480":
                return "temporarily_unavailable";
            case "481":
                return "transaction_does_not_exist";
            case "482":
                return "loop_detected";
            case "488":
                return "not_acceptable_here";
            case "489":
                return "bad_event";
            case "490":
                return "request_terminated";
            case "491":
                return "request_pending";
            case "495":
                return "invalid_ssl_cert";
            case "496":
                return "ssl_cert_required";
            case "497":
                return "http_to_https";
            case "498":
                return "token_expired";
            case "499":
                return "device_unpaired";
            case "500":
                return "internal_server_error";
            case "501":
                return "not_implemented";
            case "502":
                return "bad_gateway";
            case "503":
                return "service_unavailable";
            case "504":
                return "gateway_timeout";
            case "505":
                return "http_version_not_supported";
            case "507":
                return "insufficient_storage";
            case "511":
                return "network_authentication_required";
            case "515":
                return "protocol_violation";
            case "518":
                return "connection_replaced";
            case "540":
                return "too_many_sessions";
            case "600":
                return "restart_required";
            case "700":
                return "outdated_version";
            case "ENOTFOUND":
                return "dns_error";
            case "EAI_AGAIN":
                return "dns_retry";
            case "ECONNRESET":
                return "connection_reset";
            case "ECONNREFUSED":
                return "connection_refused";
            case "EHOSTUNREACH":
                return "host_unreachable";
            case "ENETUNREACH":
                return "network_unreachable";
            case "EPIPE":
                return "broken_pipe";
            case "EIO":
                return "io_failure";
            case "ETIMEDOUT":
                return "network_timeout";
            case "EBUSY":
                return "resource_busy";
            case "EMFILE":
                return "too_many_open_files";
            case "ENOSPC":
                return "no_space_left";
            case "EADDRINUSE":
                return "address_in_use";
            case "EADDRNOTAVAIL":
                return "address_not_available";
            case "ERR_STREAM_DESTROYED":
                return "stream_destroyed";
            case "ERR_SOCKET_CLOSED":
                return "socket_closed";
            case "ERR_HTTP2_GOAWAY_SESSION":
                return "http2_goaway";
            case "ERR_SSL_WRONG_VERSION_NUMBER":
                return "tls_version_mismatch";
            case "ERR_TLS_CERT_ALTNAME_INVALID":
                return "tls_cert_invalid";
            case "ERR_TLS_HANDSHAKE_TIMEOUT":
                return "tls_handshake_timeout";
            case "ERR_SSL_DECRYPTION_FAILED_OR_BAD_RECORD_MAC":
                return "tls_decryption_failed";
            case "ERR_SSL_EOF_IN_RECORD":
                return "tls_eof";
            case "ERR_HTTP_HEADERS_SENT":
                return "headers_already_sent";
            case "ERR_HTTP_INVALID_HEADER_VALUE":
                return "invalid_http_header";
            default: {
                const msg = (e?.message || "").toLowerCase();
                if (!msg) return "unknown";
                if (msg.includes("logged out")) return "logged_out";
                if (msg.includes("replaced") && msg.includes("session"))
                    return "connection_replaced";
                if (msg.includes("connection closed")) return "connection_closed";
                if (msg.includes("timeout")) return "timeout";
                if (msg.includes("reset")) return "connection_reset";
                if (msg.includes("hang up")) return "socket_hangup";
                if (msg.includes("dns")) return "dns_error";
                if (msg.includes("ssl") || msg.includes("tls")) return "tls_error";
                if (msg.includes("unavailable")) return "server_unavailable";
                if (msg.includes("too many")) return "too_many_sessions";
                if (msg.includes("unauthoriz") || msg.includes("forbidden")) return "forbidden";
                if (msg.includes("unpaired")) return "device_unpaired";
                if (msg.includes("restart")) return "restart_required";
                if (msg.includes("memory")) return "memory_overload";
                if (msg.includes("overflow")) return "buffer_overflow";
                return "unknown";
            }
        }
    })();

    const startKeepAlive = () => {
        if (global.__reconnect.keepAliveTimer) return;
        global.__reconnect.keepAliveTimer = setInterval(() => {
            try {
                global.timestamp.lastTick = Date.now();
            } catch (e) {
                logger.error(e);
            }
        }, 45_000);
    };

    const stopKeepAlive = () => {
        if (global.__reconnect.keepAliveTimer) {
            clearInterval(global.__reconnect.keepAliveTimer);
            global.__reconnect.keepAliveTimer = null;
        }
    };

    const tryRecover = () => {
        if (global.__reconnect.inflight) {
            return;
        }

        const now = Date.now();

        if (now < global.__reconnect.cooldownUntil) {
            const wait = global.__reconnect.cooldownUntil - now;
            logger.warn(`Cooling down after repeated failures (${Math.ceil(wait / 1000)}s)…`);
            if (!global.__reconnect.timer) {
                global.__reconnect.timer = setTimeout(() => {
                    global.__reconnect.timer = null;
                    tryRecover();
                }, wait);
            }
            return;
        }

        let baseDelay = 1_000;
        let hardStop = false;

        switch (dcReason) {
            case "logged_out":
            case "device_unpaired":
            case "pairing_required":
                hardStop = true;
                break;

            case "rate_limited":
            case "too_many_requests":
            case "too_many_sessions":
                baseDelay = 15_000;
                break;

            case "dns_error":
            case "dns_retry":
            case "connection_reset":
            case "connection_refused":
            case "network_unreachable":
            case "host_unreachable":
            case "network_timeout":
            case "tls_version_mismatch":
            case "tls_cert_invalid":
            case "tls_handshake_timeout":
            case "tls_decryption_failed":
            case "tls_eof":
            case "http2_goaway":
                baseDelay = 5_000;
                break;

            case "service_unavailable":
            case "gateway_timeout":
            case "bad_gateway":
                baseDelay = 6_000;
                break;

            case "protocol_violation":
            case "restart_required":
            case "stale_session":
            case "stale_socket":
            case "connection_replaced":
            case "internal_error":
            case "internal_server_error":
                baseDelay = 2_000;
                break;

            default:
                baseDelay = 2_000;
        }

        if (hardStop) {
            global.__reconnect.attempts = 0;
            global.__reconnect.cooldownUntil = 0;
            stopKeepAlive();
            logger.error(
                `Auto-reconnect disabled for reason: ${dcReason}. Manual action required.`
            );
            return;
        }

        const delay = backoff(baseDelay);

        if (global.__reconnect.attempts >= 6) {
            global.__reconnect.cooldownUntil = Date.now() + 5 * 60_000;
            global.__reconnect.attempts = 0;
            logger.warn("Too many consecutive failures; entering 5m cooldown.");
            return;
        }

        global.__reconnect.inflight = true;
        global.__reconnect.timer = setTimeout(async () => {
            global.__reconnect.timer = null;
            try {
                await new Promise((r) => setTimeout(r, 200));

                await global.reloadHandler(true);

                global.__reconnect.attempts += 1;
                global.__reconnect.lastAt = Date.now();

                logger.info(
                    `Reloaded session (attempt ${global.__reconnect.attempts}, reason: ${dcReason})`
                );
            } catch (e) {
                logger.error(e);
                global.__reconnect.attempts += 1;
            } finally {
                global.__reconnect.inflight = false;
            }
        }, delay);

        logger.warn(`Scheduling reconnect in ${Math.ceil(delay / 1000)}s (reason: ${dcReason})`);
    };

    if (isNewLogin) conn.isInit = true;

    switch (connection) {
        case "connecting":
            logger.info("Connecting…");
            break;

        case "open":
            logger.info("Connected to WhatsApp.");

            global.__reconnect.attempts = 0;
            global.__reconnect.cooldownUntil = 0;
            startKeepAlive();
            break;

        case "close":
            stopKeepAlive();
            logger.warn(`Connection closed — reason=${dcReason}`);
            break;
    }

    if (lastDisconnect?.error) {
        if (["logged_out", "device_unpaired", "pairing_required"].includes(dcReason)) {
            logger.error(`Session requires manual fix (${dcReason}). No auto-reconnect.`);
        } else {
            tryRecover();
        }
    }

    global.timestamp.connect = new Date();
}

export class EventManager {
    constructor() {
        this.eventHandlers = new Map();
        this.isInit = true;
        this.currentHandler = null;
    }

    clear() {
        this.eventHandlers.clear();
    }

    setHandler(handler) {
        this.currentHandler = handler;
    }

    registerHandlers(conn, handler, saveCreds, cleanupManager) {
        const messageHandler = handler?.handler?.bind(global.conn) || (() => {});
        const connectionHandler = handleDisconnect.bind(global.conn);
        const credsHandler = saveCreds?.bind(global.conn) || (() => {});

        conn.handler = messageHandler;
        conn.connectionUpdate = connectionHandler;
        conn.credsUpdate = credsHandler;

        if (conn?.ev) {
            const handlers = [
                { event: "messages.upsert", handler: messageHandler },
                { event: "connection.update", handler: connectionHandler },
                { event: "creds.update", handler: credsHandler },
            ];

            for (const { event, handler: hdlr } of handlers) {
                if (typeof hdlr === "function") {
                    conn.ev.on(event, hdlr);
                    this.eventHandlers.set(event, hdlr);
                    cleanupManager.registerEventHandler(event, hdlr);
                }
            }
        }
    }

    unregisterHandlers(conn, cleanupManager) {
        if (!this.isInit && conn?.ev) {
            const events = ["messages.upsert", "connection.update", "creds.update"];

            for (const ev of events) {
                if (this.eventHandlers.has(ev)) {
                    const oldHandler = this.eventHandlers.get(ev);
                    try {
                        conn.ev.off(ev, oldHandler);
                        cleanupManager.unregisterEventHandler(ev, oldHandler);
                    } catch (e) {
                        logger.error({ error: e.message, event: ev }, "Failed to unregister handler");
                    }
                }
            }

            this.clear();
        }
    }

    async createReloadHandler(connectionOptions, saveCreds, cleanupManager) {
        const eventManager = this;
        const handlerPath = join(process.cwd(), "handler.js");

        return async function (restartConn = false) {
            let handler = eventManager.currentHandler;

            try {
                const HandlerModule = await import(`${handlerPath}?update=${Date.now()}`);

                if (HandlerModule && typeof HandlerModule.handler === "function") {
                    handler = HandlerModule;
                    eventManager.setHandler(handler);
                }
            } catch (e) {
                logger.error({ error: e.message }, "Handler reload error");
            }

            if (!handler) return false;

            if (restartConn) {
                const oldChats = global.conn?.chats || {};

                try {
                    if (global.conn?.ev) {
                        for (const [eventName, handler] of eventManager.eventHandlers) {
                            try {
                                global.conn.ev.off(eventName, handler);
                                cleanupManager.unregisterEventHandler(eventName, handler);
                            } catch (e) {
                                logger.error({ error: e.message, event: eventName }, "Failed to remove event");
                            }
                        }
                        
                        try {
                            global.conn.ev.removeAllListeners();
                        } catch (e) {
                            logger.error({ error: e.message }, "Failed to remove all listeners");
                        }
                    }

                    if (global.conn?.ws) {
                        try {
                            global.conn.ws.close();
                        } catch (e) {
                            logger.error({ error: e.message }, "Failed to close websocket");
                        }
                    }

                    global.conn = null;

                    await new Promise(resolve => setTimeout(resolve, 100));

                    if (typeof Bun !== "undefined" && typeof Bun.gc === "function") {
                        Bun.gc(false);
                    }
                } catch (e) {
                    logger.error({ error: e.message }, "Restart error");
                }

                global.conn = naruyaizumi(connectionOptions, { chats: oldChats });
                eventManager.isInit = true;
            }

            eventManager.unregisterHandlers(global.conn, cleanupManager);
            eventManager.registerHandlers(global.conn, handler, saveCreds, cleanupManager);

            eventManager.isInit = false;
            return true;
        };
    }
}

export class CleanupManager {
    constructor() {
        this.intervals = new Set();
        this.timeouts = new Set();
        this.cleanupFC = new Set();
        this.eventHandlers = new Map();
    }

    addInterval(id) {
        this.intervals.add(id);
        return id;
    }

    addTimeout(id) {
        this.timeouts.add(id);
        return id;
    }

    addCleanup(fn) {
        this.cleanupFC.add(fn);
    }

    registerEventHandler(eventName, handler) {
        if (!this.eventHandlers.has(eventName)) {
            this.eventHandlers.set(eventName, new Set());
        }
        this.eventHandlers.get(eventName).add(handler);
    }

    unregisterEventHandler(eventName, handler) {
        if (this.eventHandlers.has(eventName)) {
            this.eventHandlers.get(eventName).delete(handler);
        }
    }

    async cleanup() {
        for (const id of this.intervals) {
            try {
                clearInterval(id);
            } catch (e) {
                logger.error({ error: e.message }, "Failed to clear interval");
            }
        }
        
        for (const id of this.timeouts) {
            try {
                clearTimeout(id);
            } catch (e) {
                logger.error({ error: e.message }, "Failed to clear timeout");
            }
        }
        
        if (global.conn?.ev) {
            for (const [eventName, handlers] of this.eventHandlers) {
                for (const handler of handlers) {
                    try {
                        global.conn.ev.off(eventName, handler);
                    } catch (e) {
                        logger.error({ error: e.message, event: eventName }, "Event cleanup error");
                    }
                }
            }
        }

        for (const fn of this.cleanupFC) {
            try {
                await Promise.race([
                    fn(),
                    new Promise((_, reject) => 
                        setTimeout(() => reject(new Error("Cleanup timeout")), 5000)
                    )
                ]);
            } catch (e) {
                logger.error({ error: e.message }, "Cleanup function error");
            }
        }

        this.intervals.clear();
        this.timeouts.clear();
        this.cleanupFC.clear();
        this.eventHandlers.clear();
    }
}

let isShuttingDown = false;

async function shutdown(signal, cleanupManager) {
    if (isShuttingDown) return;

    isShuttingDown = true;
    const startTime = Date.now();
    const emergency = setTimeout(() => {
        logger.error("Shutdown timeout, forcing exit");
        process.exit(1);
    }, 8000);

    try {
        await cleanupManager.cleanup();
        
        if (global.conn?.ws) {
            try {
                global.conn.ws.close();
            } catch (e) {
                logger.error({ error: e.message }, "WS close error");
            }
        }

        if (global.conn?.ev) {
            try {
                global.conn.ev.removeAllListeners();
            } catch (e) {
                logger.error({ error: e.message }, "Event cleanup error");
            }
        }

        if (global.sqlite) {
            try {
                global.sqlite.exec("PRAGMA wal_checkpoint(TRUNCATE);");
                global.sqlite.close();
            } catch (e) {
                logger.error({ error: e.message }, "SQLite close error");
            }
        }

        clearTimeout(emergency);
        await new Promise((resolve) => setTimeout(resolve, 100));
        process.exit(0);
    } catch (e) {
        clearTimeout(emergency);
        logger.error({ error: e.message }, "Shutdown error");
        process.exit(1);
    }
}

export function registerProcess(cleanupManager) {
    process.once("SIGTERM", () => shutdown("SIGTERM", cleanupManager));
    process.once("SIGINT", () => shutdown("SIGINT", cleanupManager));

    process.on("uncaughtException", (e) => {
        logger.error({ error: e.message, stack: e.stack }, "Uncaught exception");
        shutdown("UNCAUGHT_EXCEPTION", cleanupManager);
    });

    process.on("unhandledRejection", (e) => {
        logger.error({ error: e?.message, stack: e?.stack }, "Unhandled rejection");
        shutdown("UNHANDLED_REJECTION", cleanupManager);
    });
}

export function setupMaintenance(cleanupManager) {
    const maintenanceInterval = setInterval(async () => {
        if (!global.sqlite) return;

        try {
            global.sqlite.exec("PRAGMA wal_checkpoint(TRUNCATE);");
            global.sqlite.exec("PRAGMA optimize;");
            
            const now = Date.now();
            if (!global.lastVacuum || now - global.lastVacuum > 3600000) {
                global.sqlite.exec("VACUUM;");
                global.lastVacuum = now;
            }
        } catch (e) {
            logger.error({ error: e.message }, "Maintenance error");
        }
    }, 300000);

    cleanupManager.addInterval(maintenanceInterval);

    const memoryMonitorInterval = setInterval(() => {
        const usage = process.memoryUsage();
        const heapUsedMB = Math.round(usage.heapUsed / 1024 / 1024);
        
        if (heapUsedMB > 500) {
            if (typeof Bun !== "undefined" && typeof Bun.gc === "function") {
                Bun.gc(false);
                logger.warn({ heapMB: heapUsedMB }, "Forced garbage collection");
            }
        }
    }, 60000);

    cleanupManager.addInterval(memoryMonitorInterval);
}