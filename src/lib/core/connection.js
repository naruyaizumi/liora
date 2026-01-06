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
      } catch {}
    }
  } catch (e) {
    global.logger?.error(
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
        global.logger?.warn(
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
        global.logger?.warn(
          { file: filename, error: e.message },
          "Failed to load plugin",
        );
      }
    }

    global.logger?.info(`Plugins loaded: ${success} OK, ${failed} failed`);
  } catch (e) {
    global.logger?.error({ error: e.message }, "Error loading plugins");
    throw e;
  }
}

export class EventManager {
  constructor() {
    this.handlers = new Map();
    this.currentHandler = null;
  }

  setHandler(handler) {
    this.currentHandler = handler;
  }

  register(conn, handler, saveCreds) {
    const messageHandler = handler?.handler?.bind(conn) || (() => {});
    const credsHandler = saveCreds?.bind(conn) || (() => {});
    const connectionHandler =
      handler?.handleDisconnect?.bind(conn) ||
      global.handleDisconnect?.bind(conn);

    if (conn?.ev) {
      conn.ev.on("messages.upsert", messageHandler);
      conn.ev.on("creds.update", credsHandler);

      if (connectionHandler) {
        conn.ev.on("connection.update", connectionHandler);
        this.handlers.set("connection.update", connectionHandler);
      }

      this.handlers.set("messages.upsert", messageHandler);
      this.handlers.set("creds.update", credsHandler);
    }

    conn.handler = messageHandler;
    conn.credsUpdate = credsHandler;

    return conn;
  }

  unregister(conn) {
    if (conn?.ev) {
      for (const [event, handler] of this.handlers) {
        try {
          conn.ev.off(event, handler);
        } catch (e) {
          global.logger?.error(
            { error: e.message, event },
            "Failed to unregister handler",
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
        global.logger?.error({ error: e.message }, "Handler reload error");
        return false;
      }

      if (!handler) return false;

      if (restartConn) {
        try {
          self.unregister(global.conn);

          if (global.conn?.ws) {
            global.conn.ws.close();
          }

          await new Promise((r) => setTimeout(r, 500));

          global.conn = naruyaizumi(connectionOptions);
        } catch (e) {
          global.logger?.error({ error: e.message }, "Restart error");
          return false;
        }
      } else {
        self.unregister(global.conn);
      }

      self.register(global.conn, handler, saveCreds);
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
  return Math.max(
    500,
    raw + Math.round((Math.random() < 0.5 ? -1 : 1) * jitter),
  );
};

const getDisconnectReason = (error) => {
  const code = String(
    error?.output?.statusCode ?? error?.statusCode ?? error?.code ?? 0,
  ).toUpperCase();

  const reasons = {
    428: "replaced_by_another_session",
    515: "connection_replaced",
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

export async function handleDisconnect({
  lastDisconnect,
  connection,
  isNewLogin,
}) {
  const reason = getDisconnectReason(lastDisconnect?.error);

  if (isNewLogin) {
    global.conn.isInit = true;
  }

  switch (connection) {
    case "connecting":
      global.logger?.info("Connecting…");
      break;
    case "open":
      global.logger?.info("Connected to WhatsApp");
      RECONNECT_STATE.attempts = 0;
      RECONNECT_STATE.cooldownUntil = 0;
      break;
    case "close":
      global.logger?.warn(`Connection closed — reason=${reason}`);
      break;
  }

  if (!lastDisconnect?.error || connection !== "close") return;

  const baseDelay = getBaseDelay(reason);

  if (baseDelay === null) {
    global.logger?.error(`Session requires manual fix (${reason})`);
    return;
  }

  if (Date.now() < RECONNECT_STATE.cooldownUntil) {
    return;
  }

  if (RECONNECT_STATE.inflight) return;

  if (RECONNECT_STATE.attempts >= 6) {
    RECONNECT_STATE.cooldownUntil = Date.now() + 5 * 60_000;
    RECONNECT_STATE.attempts = 0;
    global.logger?.warn("Too many failures; entering 5m cooldown");
    return;
  }

  const delay = backoff(baseDelay);

  RECONNECT_STATE.inflight = true;
  RECONNECT_STATE.timer = setTimeout(async () => {
    RECONNECT_STATE.timer = null;

    try {
      await new Promise((r) => setTimeout(r, 200));
      await global.reloadHandler(true);

      RECONNECT_STATE.attempts += 1;
      RECONNECT_STATE.lastAt = Date.now();

      global.logger?.info(`Reconnected (attempt ${RECONNECT_STATE.attempts})`);
    } catch (e) {
      global.logger?.error({ error: e.message }, "Reconnect failed");
      RECONNECT_STATE.attempts += 1;
    } finally {
      RECONNECT_STATE.inflight = false;
    }
  }, delay);

  global.logger?.warn(`Reconnecting in ${Math.ceil(delay / 1000)}s`);
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
        global.logger?.warn(
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
    global.logger?.info({ file: filename }, "Plugin reloaded");
    return true;
  } catch (e) {
    global.logger?.error(
      { file: filepath, error: e.message },
      "Failed to reload plugin",
    );
    return false;
  }
}

export async function reloadAllPlugins(pluginFolder) {
  return loadPlugins(pluginFolder, (dir) => getAllPlugins(dir));
}
