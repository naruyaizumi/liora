/**
 * @file Plugin manager and connection lifecycle handler
 * @module core/connection
 * @description Simplified plugin system and connection management
 * @license Apache-2.0
 * @author Naruya Izumi
 */

import { readdir, stat } from "node:fs/promises";
import { join, relative, normalize } from "node:path";
import { naruyaizumi } from "./socket.js";
import { DisconnectReason } from "baileys";

export async function getAllPlugins(dir) {
    const results = [];

    try {
        const files = await readdir(dir);

        for (const file of files) {
            const filepath = join(dir, file);

            try {
                const stats = await stat(filepath);

                if (stats.isDirectory()) {
                    const nested = await getAllPlugins(filepath);
                    results.push(...nested);
                } else if (file.endsWith(".js")) {
                    results.push(filepath);
                }
            } catch {
                // Silent fail
            }
        }
    } catch {
        // Silent fail
    }

    return results;
}

export async function loadPlugins(pluginFolder) {
    let success = 0, failed = 0;

    const oldPlugins = global.plugins || {};
    for (const plugin of Object.values(oldPlugins)) {
        if (typeof plugin.cleanup === "function") {
            try {
                await plugin.cleanup();
            } catch {
                // Silent fail
            }
        }
    }

    global.plugins = {};

    const files = await getAllPlugins(pluginFolder);

    for (const filepath of files) {
        const filename = normalize(relative(pluginFolder, filepath)).replace(/\\/g, "/");

        try {
            const module = await import(`${filepath}?init=${Date.now()}`);

            if (typeof module.default?.init === "function") {
                await module.default.init();
            } else if (typeof module.init === "function") {
                await module.init();
            }

            global.plugins[filename] = module.default || module;
            success++;
        } catch (e) {
            global.logger?.error({ file: filename, error: e.message }, "Plugin failed to load");
            delete global.plugins[filename];
            failed++;
        }
    }

    global.logger?.info({ success, failed }, "Plugins loaded");

    return { success, failed };
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

    registerHandlers(sock, handler, saveCreds) {
        const messageHandler = handler?.handler?.bind(sock) || (() => {});
        const connectionHandler = handleDisconnect.bind(sock);
        const credsHandler = saveCreds?.bind(sock) || (() => {});

        sock.handler = messageHandler;
        sock.connectionUpdate = connectionHandler;
        sock.credsUpdate = credsHandler;

        if (sock?.ev) {
            const handlers = [
                { event: "messages.upsert", handler: messageHandler },
                { event: "connection.update", handler: connectionHandler },
                { event: "creds.update", handler: credsHandler },
            ];

            for (const { event, handler: hdlr } of handlers) {
                if (typeof hdlr === "function") {
                    sock.ev.on(event, hdlr);
                    this.eventHandlers.set(event, hdlr);
                }
            }
        }
    }

    unregisterHandlers(sock) {
        if (!this.isInit && sock?.ev) {
            for (const [event, handler] of this.eventHandlers) {
                try {
                    sock.ev.off(event, handler);
                } catch {
                    // Silent fail
                }
            }
            this.clear();
        }
    }

    async createReloadHandler(connectionOptions, saveCreds) {
        const eventManager = this;
        const handlerPath = join(process.cwd(), "src", "handler.js");

        return async function (restartsock = false) {
            let handler = eventManager.currentHandler;

            try {
                const HandlerModule = await import(`${handlerPath}?update=${Date.now()}`);
                if (HandlerModule && typeof HandlerModule.handler === "function") {
                    handler = HandlerModule;
                    eventManager.setHandler(handler);
                }
            } catch {
                // Silent fail
            }

            if (!handler) return false;

            if (restartsock) {
                try {
                    if (global.sock?.ev) {
                        for (const [eventName, handler] of eventManager.eventHandlers) {
                            try {
                                global.sock.ev.off(eventName, handler);
                            } catch {
                                // Silent fail
                            }
                        }
                        global.sock.ev.removeAllListeners();
                    }

                    if (global.sock?.ws) {
                        global.sock.ws.close();
                    }

                    global.sock = null;

                    await new Promise((resolve) => setTimeout(resolve, 100));

                    if (typeof Bun !== "undefined" && typeof Bun.gc === "function") {
                        Bun.gc(false);
                    }
                } catch {
                    // Silent fail
                }

                global.sock = naruyaizumi(connectionOptions);
                eventManager.isInit = true;
            }

            eventManager.unregisterHandlers(global.sock);
            eventManager.registerHandlers(global.sock, handler, saveCreds);

            eventManager.isInit = false;
            return true;
        };
    }
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

    const statusCode = lastDisconnect?.error?.output?.statusCode;
    const reason = statusCode || 0;

    const startKeepAlive = () => {
        if (global.__reconnect.keepAliveTimer) return;
        global.__reconnect.keepAliveTimer = setInterval(() => {
            try {
                global.timestamp.lastTick = Date.now();
            } catch {
                // Silent fail
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
        if (global.__reconnect.inflight) return;

        const now = Date.now();

        if (now < global.__reconnect.cooldownUntil) {
            const wait = global.__reconnect.cooldownUntil - now;
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

        switch (reason) {
            case DisconnectReason.loggedOut:
            case DisconnectReason.badSession:
                hardStop = true;
                break;

            case DisconnectReason.restartRequired:
            case DisconnectReason.connectionReplaced:
                baseDelay = 2_000;
                break;

            case DisconnectReason.timedOut:
            case DisconnectReason.connectionLost:
                baseDelay = 5_000;
                break;

            case DisconnectReason.multideviceMismatch:
                baseDelay = 3_000;
                break;

            default:
                baseDelay = 2_000;
        }

        if (hardStop) {
            global.__reconnect.attempts = 0;
            global.__reconnect.cooldownUntil = 0;
            stopKeepAlive();
            global.logger?.error("Connection terminated - manual intervention required");
            return;
        }

        const delay = backoff(baseDelay);

        if (global.__reconnect.attempts >= 6) {
            global.__reconnect.cooldownUntil = Date.now() + 5 * 60_000;
            global.__reconnect.attempts = 0;
            global.logger?.warn("Max reconnect attempts reached - cooling down for 5 minutes");
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
            } catch {
                global.__reconnect.attempts += 1;
            } finally {
                global.__reconnect.inflight = false;
            }
        }, delay);
    };

    if (isNewLogin) global.sock.isInit = true;

    switch (connection) {
        case "connecting":
            global.logger?.info("Connecting to WhatsApp...");
            break;

        case "open":
            global.__reconnect.attempts = 0;
            global.__reconnect.cooldownUntil = 0;
            startKeepAlive();
            global.logger?.info("Connected successfully!");
            break;

        case "close":
            stopKeepAlive();
            global.logger?.warn("Connection closed");
            break;
    }

    if (lastDisconnect?.error) {
        if (reason === DisconnectReason.loggedOut || reason === DisconnectReason.badSession) {
            global.logger?.error("Session invalid - please re-authenticate");
        } else {
            tryRecover();
        }
    }

    global.timestamp.connect = new Date();
}

export function cleanupReconnect() {
    if (!global.__reconnect) {
        global.__reconnect = {
            attempts: 0,
            lastAt: 0,
            cooldownUntil: 0,
            inflight: false,
            timer: null,
            keepAliveTimer: null,
        };
        return;
    }

    if (global.__reconnect.timer) {
        clearTimeout(global.__reconnect.timer);
        global.__reconnect.timer = null;
    }

    if (global.__reconnect.keepAliveTimer) {
        clearInterval(global.__reconnect.keepAliveTimer);
        global.__reconnect.keepAliveTimer = null;
    }

    global.__reconnect.attempts = 0;
    global.__reconnect.cooldownUntil = 0;
    global.__reconnect.inflight = false;
    global.__reconnect.lastAt = 0;
}

export async function reloadSinglePlugin(filepath, pluginFolder) {
    try {
        const filename = normalize(relative(pluginFolder, filepath)).replace(/\\/g, "/");
        const oldPlugin = global.plugins[filename];

        if (oldPlugin && typeof oldPlugin.cleanup === "function") {
            try {
                await oldPlugin.cleanup();
            } catch {
                // Silent fail
            }
        }

        const module = await import(`${filepath}?reload=${Date.now()}`);

        if (typeof module.default?.init === "function") {
            await module.default.init();
        } else if (typeof module.init === "function") {
            await module.init();
        }

        global.plugins[filename] = module.default || module;
        return true;
    } catch {
        return false;
    }
}

export async function reloadAllPlugins(pluginFolder) {
    return loadPlugins(pluginFolder);
}
