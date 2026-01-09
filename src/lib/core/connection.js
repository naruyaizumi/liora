/* global conn */
import { readdir, stat } from "node:fs/promises";
import { join, relative, normalize } from "node:path";
import { naruyaizumi } from "./socket.js";

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
          //
      }
    }
  } catch (e) {
    global.logger?.error?.(
      { error: e.message },
      "Error reading plugin directory",
    );
  }

  return results;
}

export async function loadPlugins(pluginFolder, getAllPluginsFn) {
  let success = 0,
    failed = 0;

  const oldPlugins = global.plugins || {};
  for (const [filename, plugin] of Object.entries(oldPlugins)) {
    if (typeof plugin.cleanup === "function") {
      try {
        await plugin.cleanup();
      } catch (e) {
        global.logger?.warn?.(
          { file: filename, error: e.message },
          "Plugin cleanup error",
        );
      }
    }
  }

  global.plugins = {};

  try {
    const files = await getAllPluginsFn(pluginFolder);

    for (const filepath of files) {
      const filename = normalize(relative(pluginFolder, filepath)).replace(
        /\\/g,
        "/",
      );

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
        delete global.plugins[filename];
        failed++;
        global.logger?.warn?.(
          { file: filename, error: e.message },
          "Failed to load plugin",
        );
      }
    }

    global.logger?.info?.(`Plugins loaded: ${success} OK, ${failed} failed`);
  } catch (e) {
    global.logger?.error?.({ error: e.message }, "Error loading plugins");
    throw e;
  }
}

export class CleanupManager {
    constructor() {
        this.handlers = new Map();
    }

    registerEventHandler(event, handler) {
        if (!this.handlers.has(event)) {
            this.handlers.set(event, new Set());
        }
        this.handlers.get(event).add(handler);
    }

    unregisterEventHandler(event, handler) {
        if (this.handlers.has(event)) {
            this.handlers.get(event).delete(handler);
            if (this.handlers.get(event).size === 0) {
                this.handlers.delete(event);
            }
        }
    }

    cleanup() {
        this.handlers.clear();
    }
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
                        global.logger.error(
                            { error: e.message, event: ev },
                            "Failed to unregister handler"
                        );
                    }
                }
            }

            this.clear();
        }
    }

    async createReloadHandler(connectionOptions, saveCreds, cleanupManager) {
        const eventManager = this;
        const handlerPath = join(process.cwd(), "src", "handler.js");

        return async function (restartConn = false) {
            let handler = eventManager.currentHandler;

            try {
                const HandlerModule = await import(`${handlerPath}?update=${Date.now()}`);

                if (HandlerModule && typeof HandlerModule.handler === "function") {
                    handler = HandlerModule;
                    eventManager.setHandler(handler);
                }
            } catch (e) {
                global.logger.error({ error: e.message }, "Handler reload error");
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
                                global.logger.error(
                                    { error: e.message, event: eventName },
                                    "Failed to remove event"
                                );
                            }
                        }

                        try {
                            global.conn.ev.removeAllListeners();
                        } catch (e) {
                            global.logger.error({ error: e.message }, "Failed to remove all listeners");
                        }
                    }

                    if (global.conn?.ws) {
                        try {
                            global.conn.ws.close();
                        } catch (e) {
                            global.logger.error({ error: e.message }, "Failed to close websocket");
                        }
                    }

                    global.conn = null;

                    await new Promise((resolve) => setTimeout(resolve, 100));

                    if (typeof Bun !== "undefined" && typeof Bun.gc === "function") {
                        Bun.gc(false);
                    }
                } catch (e) {
                    global.logger.error({ error: e.message }, "Restart error");
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
                global.logger.error(e);
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
            global.logger.warn(`Cooling down after repeated failures (${Math.ceil(wait / 1000)}s)…`);
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
            global.logger.error(
                `Auto-reconnect disabled for reason: ${dcReason}. Manual action required.`
            );
            return;
        }

        const delay = backoff(baseDelay);

        if (global.__reconnect.attempts >= 6) {
            global.__reconnect.cooldownUntil = Date.now() + 5 * 60_000;
            global.__reconnect.attempts = 0;
            global.logger.warn("Too many consecutive failures; entering 5m cooldown.");
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

                global.logger.info(
                    `Reloaded session (attempt ${global.__reconnect.attempts}, reason: ${dcReason})`
                );
            } catch (e) {
                global.logger.error(e);
                global.__reconnect.attempts += 1;
            } finally {
                global.__reconnect.inflight = false;
            }
        }, delay);

        global.logger.warn(`Scheduling reconnect in ${Math.ceil(delay / 1000)}s (reason: ${dcReason})`);
    };

    if (isNewLogin) conn.isInit = true;

    switch (connection) {
        case "connecting":
            global.logger.info("Connecting…");
            break;

        case "open":
            global.logger.info("Connected to WhatsApp.");

            global.__reconnect.attempts = 0;
            global.__reconnect.cooldownUntil = 0;
            startKeepAlive();
            break;

        case "close":
            stopKeepAlive();
            global.logger.warn(`Connection closed — reason=${dcReason}`);
            break;
    }

    if (lastDisconnect?.error) {
        if (["logged_out", "device_unpaired", "pairing_required"].includes(dcReason)) {
            global.logger.error(`Session requires manual fix (${dcReason}). No auto-reconnect.`);
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
    const filename = normalize(relative(pluginFolder, filepath)).replace(
      /\\/g,
      "/",
    );
    const oldPlugin = global.plugins[filename];

    if (oldPlugin && typeof oldPlugin.cleanup === "function") {
      try {
        await oldPlugin.cleanup();
      } catch (e) {
        global.logger?.warn?.(
          { file: filename, error: e.message },
          "Plugin cleanup error",
        );
      }
    }

    const module = await import(`${filepath}?reload=${Date.now()}`);

    if (typeof module.default?.init === "function") {
      await module.default.init();
    } else if (typeof module.init === "function") {
      await module.init();
    }

    global.plugins[filename] = module.default || module;
    global.logger?.info?.({ file: filename }, "Plugin reloaded");
    return true;
  } catch (e) {
    global.logger?.error?.(
      { file: filepath, error: e.message },
      "Failed to reload plugin",
    );
    return false;
  }
}

export async function reloadAllPlugins(pluginFolder) {
  return loadPlugins(pluginFolder, (dir) => getAllPlugins(dir));
}