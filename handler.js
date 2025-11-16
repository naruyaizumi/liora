/* global conn */
/* eslint no-unused-vars: ["error", { "argsIgnorePattern": "^_" }] */
import "#global";
import "#config";
import { smsg } from "./lib/core/smsg.js";
import { fileURLToPath } from "url";
import path, { join } from "path";
import chokidar from "chokidar";
import printMessage from "./lib/console.js";

const escapeRegExp = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const safe = async (fn, fallback = undefined) => {
    try {
        return await fn();
    } catch {
        return fallback;
    }
};

const resolveLID = async (sender) => {
    if (!sender || typeof sender !== "string") return null;

    if (sender.endsWith("@lid")) {
        return sender.split("@")[0];
    }

    if (sender.endsWith("@s.whatsapp.net")) {
        const resolved = await safe(async () => {
            if (!conn.signalRepository?.lidMapping?.getLIDForPN) return null;
            return await conn.signalRepository.lidMapping.getLIDForPN(sender);
        });

        if (resolved) {
            return typeof resolved === "string" && resolved.endsWith("@lid")
                ? resolved.split("@")[0]
                : String(resolved).split("@")[0];
        }

        return sender.split("@")[0];
    }

    return sender.split("@")[0];
};

const getSettings = (jid) => {
    try {
        return global.db?.data?.settings?.[jid] || {};
    } catch {
        return {};
    }
};

class RateLimiter {
    constructor(windowMs = 3000, maxRequests = 5) {
        this.windowMs = windowMs;
        this.maxRequests = maxRequests;
        this.limits = new Map();
        this.cleanupInterval = setInterval(() => this.cleanup(), 30000);
    }

    check(userId) {
        const now = Date.now();
        const userLimit = this.limits.get(userId);

        if (!userLimit) {
            this.limits.set(userId, { count: 1, timestamp: now });
            return true;
        }

        if (now - userLimit.timestamp > this.windowMs) {
            this.limits.set(userId, { count: 1, timestamp: now });
            return true;
        }

        if (userLimit.count >= this.maxRequests) {
            return false;
        }

        userLimit.count++;
        return true;
    }

    cleanup() {
        const now = Date.now();
        for (const [userId, data] of this.limits.entries()) {
            if (now - data.timestamp > this.windowMs) {
                this.limits.delete(userId);
            }
        }
    }

    clear() {
        clearInterval(this.cleanupInterval);
        this.limits.clear();
    }
}

class CacheManager {
    constructor(ttl = 5000) {
        this.ttl = ttl;
        this.cache = new Map();
        this.cleanupInterval = setInterval(() => this.cleanup(), 30000);
    }

    set(key, value) {
        this.cache.set(key, { value, timestamp: Date.now() });
    }

    get(key) {
        const entry = this.cache.get(key);
        if (!entry) return null;

        if (Date.now() - entry.timestamp > this.ttl) {
            this.cache.delete(key);
            return null;
        }

        return entry.value;
    }

    has(key) {
        return this.get(key) !== null;
    }

    cleanup() {
        const now = Date.now();
        for (const [key, entry] of this.cache.entries()) {
            if (now - entry.timestamp > this.ttl) {
                this.cache.delete(key);
            }
        }
    }

    clear() {
        clearInterval(this.cleanupInterval);
        this.cache.clear();
    }
}

class AsyncCommandProcessor {
    constructor() {
        this.processing = new Map();
        this.maxConcurrent = 10;
        this.commandTimeout = 120000;
        this.cleanupInterval = setInterval(() => this.cleanup(), 30000);
    }

    async process(key, fn) {
        if (this.processing.has(key)) {
            const startTime = this.processing.get(key);
            if (Date.now() - startTime > this.commandTimeout) {
                this.processing.delete(key);
            } else {
                return false;
            }
        }

        if (this.processing.size >= this.maxConcurrent) {
            return false;
        }

        this.processing.set(key, Date.now());

        try {
            const timeoutPromise = new Promise((_, reject) => {
                setTimeout(() => reject(new Error('Command execution timeout')), this.commandTimeout);
            });

            await Promise.race([fn(), timeoutPromise]);
            return true;
        } finally {
            this.processing.delete(key);
        }
    }

    isProcessing(key) {
        return this.processing.has(key);
    }

    get size() {
        return this.processing.size;
    }

    cleanup() {
        const now = Date.now();
        for (const [key, startTime] of this.processing.entries()) {
            if (now - startTime > this.commandTimeout) {
                this.processing.delete(key);
            }
        }
    }

    clear() {
        clearInterval(this.cleanupInterval);
        this.processing.clear();
    }
}

const rateLimiter = new RateLimiter(3000, 5);
const messageCache = new CacheManager(5000);
const denialCache = new CacheManager(60000);
const commandProcessor = new AsyncCommandProcessor();

const CMD_PREFIX_RE = /^[/!.]/;

const parsePrefix = (connPrefix, pluginPrefix) => {
    if (pluginPrefix) return pluginPrefix;
    if (connPrefix) return connPrefix;
    return CMD_PREFIX_RE;
};

const matchPrefix = (prefix, text) => {
    if (!text || typeof text !== "string") return [[[], new RegExp()]];

    if (prefix instanceof RegExp) return [[prefix.exec(text), prefix]];

    if (Array.isArray(prefix)) {
        return prefix.map((p) => {
            const re = p instanceof RegExp ? p : new RegExp(escapeRegExp(p));
            return [re.exec(text), re];
        });
    }

    if (typeof prefix === "string") {
        const esc = new RegExp(`^${escapeRegExp(prefix)}`, "i");
        return [[esc.exec(text), esc]];
    }

    return [[[], new RegExp()]];
};

const isCmdAccepted = (cmd, rule) => {
    if (rule instanceof RegExp) return rule.test(cmd);
    if (Array.isArray(rule))
        return rule.some((r) => (r instanceof RegExp ? r.test(cmd) : r === cmd));
    if (typeof rule === "string") return rule === cmd;
    return false;
};

const sendDenied = async (conn, m) => {
    const cacheKey = `denied_${m.sender}`;
    if (denialCache.has(cacheKey)) return;

    const userName = await safe(() => conn.getName(m.sender), "User");
    denialCache.set(cacheKey, true);

    return conn.sendMessage(
        m.chat,
        {
            text: [
                `┌─[ACCESS DENIED]─────`,
                `│  Private chat is currently disabled.`,
                "└─────────────────────",
                `User   : ${userName}`,
                `Action : Blocked private access`,
                `Group  : ${global.config?.group || "N/A"}`,
                "─────────────────────",
                "Join the group to continue using the bot.",
            ].join("\n"),
            contextInfo: {
                externalAdReply: {
                    title: "ACCESS DENIED",
                    body: global.config?.watermark || "Bot",
                    mediaType: 1,
                    thumbnailUrl: "https://qu.ax/DdwBH.jpg",
                    renderLargerThumbnail: true,
                },
            },
        },
        { quoted: m }
    );
};

const traceError = async (conn, m, pluginRef, chatRef, e) => {
    const ts = new Date().toISOString().replace("T", " ").split(".")[0];
    const text = String(e?.stack || e);
    const msg = [
        `┌─[${ts}]─[ERROR]`,
        `│ Plugin : ${pluginRef}`,
        `│ ChatID : ${chatRef}`,
        "├─TRACEBACK─────────────",
        ...text
            .trim()
            .split("\n")
            .slice(0, 10)
            .map((line) => `│ ${line}`),
        "└───────────────────────",
    ].join("\n");

    return conn.sendMessage(
        m.chat,
        {
            text: msg,
            contextInfo: {
                externalAdReply: {
                    title: "System Error Log",
                    body: "Runtime diagnostic",
                    thumbnailUrl: "https://qu.ax/MtzsZ.jpg",
                    mediaType: 1,
                    renderLargerThumbnail: true,
                },
            },
        },
        { quoted: m }
    );
};

const isFromSelf = (m, botUser) => {
    if (!m || !botUser) return false;
    if (m.key?.fromMe) return true;
    
    const botJid = botUser.jid || botUser.id;
    if (!botJid) return false;
    
    const normalizedBotJid = botJid.split('@')[0];
    
    if (m.sender) {
        const normalizedSender = m.sender.split('@')[0];
        if (normalizedSender === normalizedBotJid) return true;
    }
    
    if (m.key?.participant) {
        const normalizedParticipant = m.key.participant.split('@')[0];
        if (normalizedParticipant === normalizedBotJid) return true;
    }
    
    return false;
};

export async function handler(chatUpdate) {
    if (!chatUpdate) return;

    await safe(() => this.pushMessage(chatUpdate.messages));
    const last = chatUpdate.messages?.[chatUpdate.messages.length - 1];
    if (!last) return;

    let m = smsg(this, last) || last;
    if (!m || m.isBaileys || m.isChannel) return;

    const settings = getSettings(this.user?.jid);
    
    const isSelfMessage = isFromSelf(m, this.user);
    
    if (isSelfMessage) {
        const text = m.text || '';
        if (!text.startsWith('!self')) {
            return;
        }
    }

    const senderLid = await resolveLID(m.sender);

    if (!senderLid) {
        this.logger?.warn("Could not resolve sender LID");
        return;
    }
    
    const regOwners = (global.config?.owner || [])
        .filter(([id]) => id)
        .map(([id]) => {
            const idStr = String(id);
            return idStr.split("@")[0];
        });
    const isOwner = regOwners.includes(senderLid);

    const groupMetadata = m.isGroup
        ? this.chats?.[m.chat]?.metadata || (await safe(() => this.groupMetadata(m.chat), null))
        : {};
    const participants = groupMetadata?.participants || [];
    const map = Object.fromEntries(participants.map((p) => [p.id, p]));
    const senderId = m.sender;
    const botId = this.decodeJid(this.user.lid);
    const user = map[senderId] || {};
    const bot = map[botId] || {};
    const isRAdmin = user?.admin === "superadmin";
    const isAdmin = isRAdmin || user?.admin === "admin";
    const isBotAdmin = bot?.admin === "admin" || bot?.admin === "superadmin";
    
    const ___dirname = path.join(path.dirname(fileURLToPath(import.meta.url)), "./plugins");

    const pluginSnapshot = Object.entries(global.plugins || {});
    for (const [name, plugin] of pluginSnapshot) {
        if (!plugin || plugin.disabled) continue;

        const __filename = join(___dirname, name);

        if (typeof plugin.all === "function") {
            await safe(() =>
                plugin.all.call(this, m, {
                    chatUpdate,
                    __dirname: ___dirname,
                    __filename,
                })
            );
        }
    }

    const availablePlugins = {};
    const shouldRestrictAdmin = !settings?.restrict;
    
    for (const [name, plugin] of Object.entries(global.plugins || {})) {
        if (!plugin || plugin.disabled) continue;
        
        if (shouldRestrictAdmin && plugin.tags?.includes("admin")) {
            continue;
        }
        
        availablePlugins[name] = plugin;
    }

    const chat = global.db?.data?.chats?.[m.chat];
    
    if (!m.fromMe && settings?.self && !isOwner) return;
    
    if (settings?.gconly && !m.isGroup && !isOwner) {
        await sendDenied(this, m);
        return;
    }
    
    if (!isAdmin && !isOwner && chat?.adminOnly) return;
    if (!isOwner && chat?.mute) return;

    if (!isOwner) {
        if (!rateLimiter.check(m.sender)) {
            const cacheKey = `ratelimit_${m.sender}`;
            if (!messageCache.has(cacheKey)) {
                messageCache.set(cacheKey, true);
                await safe(() => m.reply("Too many commands! Please wait a moment."));
            }
            return;
        }
    }

    if (settings?.autoread) {
        await safe(() => this.readMessages([m.key]));
    }

    let targetPlugin = null;
    let targetName = null;
    let usedPrefix = null;
    let noPrefix = null;
    let command = null;
    let argsArr = [];
    let _args = [];
    let text = "";
    let match = null;

    for (const name in availablePlugins) {
        const plugin = availablePlugins[name];
        if (!plugin || plugin.disabled) continue;
        if (typeof plugin !== "function") continue;
        if (!plugin.command) continue;

        const prefix = parsePrefix(this.prefix, plugin.customPrefix);
        const body = typeof m.text === "string" ? m.text : "";
        const prefixMatch = matchPrefix(prefix, body).find((p) => p[1]);

        if (prefixMatch && prefixMatch[0]) {
            usedPrefix = (prefixMatch[0] || "")[0];

            if (usedPrefix) {
                noPrefix = body.replace(usedPrefix, "");
                const parts = noPrefix.trim().split(/\s+/);
                const [rawCmd, ...argsArray] = parts;
                const cmd = (rawCmd || "").toLowerCase();
                _args = parts.slice(1);
                text = _args.join(" ");

                const isAccept = isCmdAccepted(cmd, plugin.command);

                if (isAccept) {
                    targetPlugin = plugin;
                    targetName = name;
                    command = cmd;
                    argsArr = argsArray;
                    match = prefixMatch;
                    m.plugin = name;
                    break;
                }
            }
        }
    }

    if (!targetPlugin) return;

    const fail = targetPlugin.fail || global.dfail;

    if (targetPlugin.owner && !isOwner) {
        fail("owner", m, this);
        return;
    }
    if (targetPlugin.group && !m.isGroup) {
        fail("group", m, this);
        return;
    }
    if (targetPlugin.restrict) {
        fail("restrict", m, this);
        return;
    }
    if (targetPlugin.botAdmin && !isBotAdmin) {
        fail("botAdmin", m, this);
        return;
    }
    if (targetPlugin.admin && !isAdmin) {
        fail("admin", m, this);
        return;
    }

    const extra = {
        match,
        usedPrefix,
        noPrefix,
        _args,
        args: argsArr || [],
        command,
        text,
        conn: this,
        participants,
        groupMetadata,
        user,
        bot,
        isOwner,
        isRAdmin,
        isAdmin,
        isBotAdmin,
        chatUpdate,
        __dirname: ___dirname,
        __filename: join(___dirname, targetName),
    };

    const commandKey = `${m.sender}_${targetName}`;
    const conn = this;

    if (commandProcessor.isProcessing(commandKey)) {
        await safe(() => m.reply("Please wait for the previous command to finish."));
        return;
    }

    const processed = await commandProcessor.process(commandKey, async () => {
        try {
            await targetPlugin.call(conn, m, extra);

            if (typeof targetPlugin.after === "function") {
                await safe(() => targetPlugin.after.call(conn, m, extra));
            }
        } catch (e) {
            if (e?.message?.includes("timeout") || 
                e?.message?.includes("timed out") || 
                e?.name === "TimeoutError") {
                conn.logger?.warn(`Command "${targetName}" timed out for user ${m.sender}`);
                await safe(async () => {
                    await m.reply(
                        `Command timeout!\n\nThe command "${command}" took too long to execute.\nPlease try again later.`
                    );
                });
            } else if (e?.message?.includes("rate limit") || e?.message?.includes("429")) {
                await safe(() =>
                    m.reply("Rate limit reached. Please wait a moment before trying again.")
                );
            } else {
                conn.logger?.error(`Error in ${targetName}:`, e.message);
                conn.logger?.error(e.stack);
                if (settings?.noerror) {
                    await safe(() => m.reply(`An error occurred while executing the command.`));
                } else {
                    await traceError(conn, m, targetName, m.chat, e);
                }
            }
        }
    });

    if (!processed) {
        await safe(() => m.reply("Bot is currently busy. Please try again in a moment."));
    }

    if (!settings?.noprint) {
        await safe(() => printMessage(m, this));
    }
}

const file = fileURLToPath(import.meta.url);
let watcher;
let reloadLock = false;
let isCleaningUp = false;

try {
    watcher = chokidar.watch(file, {
        persistent: true,
        ignoreInitial: true,
        awaitWriteFinish: {
            stabilityThreshold: 500,
            pollInterval: 100,
        },
        atomic: true,
    });

    watcher.on("change", async () => {
        if (reloadLock) return;

        reloadLock = true;

        const instance = global.conn || conn;
        if (instance?.logger) {
            instance.logger.info("handler.js updated — reloading modules");
        }

        try {
            if (global.reloadHandler) {
                await global.reloadHandler();
            }
        } catch (e) {
            if (instance?.logger) {
                instance.logger.error("Reload error:", e.message);
                instance.logger.error(e.stack);
            }
        } finally {
            setTimeout(() => {
                reloadLock = false;
            }, 1000);
        }
    });

    watcher.on("error", (error) => {
        const instance = global.conn || conn;
        if (instance?.logger) {
            instance.logger.error("Watcher error:", error.message);
        }
    });
} catch (e) {
    console.error("Watcher initialization error:", e.message);
}

const cleanup = () => {
    if (isCleaningUp) return;
    isCleaningUp = true;

    try {
        if (watcher) {
            watcher.close();
        }

        rateLimiter.clear();
        messageCache.clear();
        denialCache.clear();
        commandProcessor.clear();

        console.log("Handler cleanup completed");
    } catch (e) {
        console.error("Cleanup error:", e.message);
    }
};

process.once("SIGINT", cleanup);
process.once("SIGTERM", cleanup);
process.on("exit", (code) => {
    cleanup();
    console.log(`Process exiting with code: ${code}`);
});