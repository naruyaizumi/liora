/* global conn */
/* eslint no-unused-vars: ["error", { "argsIgnorePattern": "^_" }] */
import { smsg } from "#core/smsg.js";
import printMessage from "#lib/console.js";

const CMD_PREFIX_RE = /^[/!.]/;

const safe = async (fn, fallback = undefined) => {
  try {
    return await fn();
  } catch {
    return fallback;
  }
};

const parsePrefix = (connPrefix, pluginPrefix) => {
  if (pluginPrefix) return pluginPrefix;
  if (connPrefix) return connPrefix;
  return CMD_PREFIX_RE;
};

const matchPrefix = (prefix, text) => {
  if (prefix instanceof RegExp) {
    return [[prefix.exec(text), prefix]];
  }

  if (Array.isArray(prefix)) {
    return prefix.map((p) => {
      const re =
        p instanceof RegExp
          ? p
          : new RegExp(p.replace(/[|\\{}()[\]^$+*?.]/g, "\\$&"));
      return [re.exec(text), re];
    });
  }

  if (typeof prefix === "string") {
    const escaped = prefix.replace(/[^a-zA-Z0-9_-]/g, "\\$&");
    const regex = new RegExp(`^${escaped}`, "i");
    return [[regex.exec(text), regex]];
  }

  return [[[], new RegExp()]];
};

const isCmdMatch = (cmd, rule) => {
  if (rule instanceof RegExp) return rule.test(cmd);
  if (Array.isArray(rule))
    return rule.some((r) => (r instanceof RegExp ? r.test(cmd) : r === cmd));
  if (typeof rule === "string") return rule === cmd;
  return false;
};

const resolveLid = async (sender) => {
  if (sender.endsWith("@lid")) {
    return sender.split("@")[0];
  }

  if (sender.endsWith("@s.whatsapp.net")) {
    const resolved = await conn.signalRepository.lidMapping.getLIDForPN(sender);
    if (resolved) {
      return typeof resolved === "string" && resolved.endsWith("@lid")
        ? resolved.split("@")[0]
        : resolved;
    }
  }

  return sender.split("@")[0];
};

// Async pipeline untuk parallel plugin processing
const pluginPipeline = {
  queue: [],
  processing: false,

  async add(task) {
    this.queue.push(task);
    if (!this.processing) {
      this.processing = true;
      setImmediate(() => this.process());
    }
  },

  async process() {
    while (this.queue.length > 0) {
      const batch = this.queue.splice(0, 5);
      await Promise.allSettled(
        batch.map((task) =>
          task().catch((e) =>
            global.logger?.error({ error: e.message }, "Plugin pipeline error"),
          ),
        ),
      );
    }
    this.processing = false;
  },
};

// Pre-compile plugin data untuk performa maksimal
let preCompiledPlugins = null;
const compilePlugins = () => {
  if (preCompiledPlugins) return preCompiledPlugins;

  const compiled = [];
  for (const name in global.plugins) {
    const plugin = global.plugins[name];
    if (!plugin || plugin.disabled || typeof plugin !== "function") continue;

    const prefix = parsePrefix(null, plugin.customPrefix);

    // Pre-compile prefix matchers
    let prefixMatchers = [];
    if (prefix instanceof RegExp) {
      prefixMatchers = [prefix];
    } else if (Array.isArray(prefix)) {
      prefixMatchers = prefix.map((p) =>
        p instanceof RegExp
          ? p
          : new RegExp(`^${p.replace(/[|\\{}()[\]^$+*?.]/g, "\\$&")}`, "i"),
      );
    } else if (typeof prefix === "string") {
      const escaped = prefix.replace(/[^a-zA-Z0-9_-]/g, "\\$&");
      prefixMatchers = [new RegExp(`^${escaped}`, "i")];
    } else {
      prefixMatchers = [CMD_PREFIX_RE];
    }

    compiled.push({
      name,
      plugin,
      prefixMatchers,
      commandRule: plugin.command,
      owner: plugin.owner || false,
      group: plugin.group || false,
      botAdmin: plugin.botAdmin || false,
      admin: plugin.admin || false,
      fail: plugin.fail || global.dfail,
    });
  }

  preCompiledPlugins = compiled;
  return compiled;
};

export async function handler(chatUpdate) {
  try {
    if (!chatUpdate?.messages?.length) return;

    const lastMsg = chatUpdate.messages[chatUpdate.messages.length - 1];
    if (!lastMsg) return;

    // 1. Async serialize message - tidak blocking
    const m = smsg(this, lastMsg);
    if (!m || m.isBaileys || m.fromMe) return;

    // 2. Immediate async operations
    setImmediate(async () => {
      try {
        // Auto-read selalu aktif
        await this.readMessages([m.key]);

        // Print message selalu aktif
        await printMessage(m, this);

        // Push message ke Redis async
        await this.pushMessage(chatUpdate.messages);
      } catch (e) {
        global.logger?.error({ error: e.message }, "Handler async ops error");
      }
    });

    // 3. Process plugins in background pipeline
    pluginPipeline.add(async () => {
      try {
        await processPlugins(m, this);
      } catch (e) {
        global.logger?.error({ error: e.message }, "Plugin processing error");
      }
    });
  } catch (e) {
    global.logger?.error({ error: e.message, stack: e.stack }, "Handler error");
  }
}

// Async plugin processor
async function processPlugins(m, conn) {
  // 1. Get essential data secara parallel
  const [senderLid, settings, chatData] = await Promise.all([
    resolveLid(m.sender),
    Promise.resolve(global.db?.data?.settings?.[conn.user?.lid] || {}),
    Promise.resolve(global.db?.data?.chats?.[m.chat] || {}),
  ]);

  const regOwners = global.config.owner.map(
    (id) => id.toString().split("@")[0],
  );
  const isOwner = m.fromMe || regOwners.includes(senderLid);

  // 2. Get group data hanya jika perlu
  let groupData = {};
  let isAdmin = false;
  let isBotAdmin = false;

  if (m.isGroup) {
    try {
      // Async fetch group metadata
      groupData = await conn.groupMetadata(m.chat).catch(() => ({}));
      const participants = groupData?.participants || [];

      const participantMap = new Map();
      participants.forEach((p) => participantMap.set(p.id, p));

      const botId = conn.decodeJid(conn.user.lid);
      const user = participantMap.get(m.sender) || {};
      const bot = participantMap.get(botId) || {};

      isAdmin = user?.admin === "superadmin" || user?.admin === "admin";
      isBotAdmin = bot?.admin === "admin" || bot?.admin === "superadmin";
    } catch (e) {
      // Silent fail for group data
    }
  }

  // 3. Check basic restrictions
  if (!m.fromMe && settings?.self && !isOwner) return;
  if (settings?.gconly && !m.isGroup && !isOwner) return;
  if (!isAdmin && !isOwner && chatData?.adminOnly) return;
  if (!isOwner && chatData?.mute) return;

  // 4. Get pre-compiled plugins
  const plugins = compilePlugins();
  const body = typeof m.text === "string" ? m.text : "";

  // 5. Fast plugin matching
  for (const plugin of plugins) {
    // Check prefix match
    let match = null;
    for (const regex of plugin.prefixMatchers) {
      match = regex.exec(body);
      if (match) break;
    }

    if (!match) continue;

    // Parse command
    const usedPrefix = match[0];
    const noPrefix = body.replace(usedPrefix, "");
    const parts = noPrefix.trim().split(/\s+/);
    if (parts.length === 0) continue;

    const [rawCmd, ...argsArr] = parts;
    const command = (rawCmd || "").toLowerCase();
    const text = parts.slice(1).join(" ");

    if (!isCmdMatch(command, plugin.commandRule)) continue;

    // Check permissions
    if (plugin.owner && !isOwner) {
      plugin.fail("owner", m, conn);
      continue;
    }

    if (plugin.group && !m.isGroup) {
      plugin.fail("group", m, conn);
      continue;
    }

    if (plugin.botAdmin && !isBotAdmin) {
      plugin.fail("botAdmin", m, conn);
      continue;
    }

    if (plugin.admin && !isAdmin) {
      plugin.fail("admin", m, conn);
      continue;
    }

    // Prepare extra data
    const extra = {
      match: [match, plugin.prefixMatchers[0]],
      usedPrefix,
      noPrefix,
      args: argsArr,
      command,
      text,
      conn,
      isOwner,
      isAdmin,
      isBotAdmin,
      chatUpdate: { messages: [m] },
    };

    // Execute plugin
    try {
      await plugin.plugin.call(conn, m, extra);
    } catch (e) {
      global.logger?.error(
        {
          plugin: plugin.name,
          error: e.message,
          stack: e.stack,
        },
        "Plugin execution error",
      );

      try {
        await m.reply("Something went wrong.");
      } catch {
        // Silent fail
      }
    }

    // Hanya eksekusi satu plugin yang match
    break;
  }
}

// Cleanup pre-compiled plugins saat hot reload
if (global.plugins) {
  const originalSet = global.plugins;
  global.plugins = new Proxy(originalSet, {
    set(target, prop, value) {
      preCompiledPlugins = null; // Reset cache saat plugin berubah
      target[prop] = value;
      return true;
    },
    deleteProperty(target, prop) {
      preCompiledPlugins = null;
      delete target[prop];
      return true;
    },
  });
}
