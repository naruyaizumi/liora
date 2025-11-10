/* global conn */
/* eslint no-unused-vars: ["error", { "argsIgnorePattern": "^_" }] */
import "#global";
import "#config";
import { smsg } from "./lib/core/smsg.js";
import { fileURLToPath } from "url";
import path, { join } from "path";
import chokidar from "chokidar";
import PQueue from "p-queue";
import printMessage from "./lib/utils/console.js";

const escapeRegExp = (str) => {
    return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
};

const safe = async (fn, fallback = undefined) => {
    try {
        return await fn();
    } catch {
        return fallback;
    }
};

const resolveLID = async (sender) => {
    let senderLid = sender;

    if (!senderLid || typeof senderLid !== "string") {
        return null;
    }

    if (senderLid.endsWith("@lid")) {
        return senderLid.split("@")[0];
    }

    if (senderLid.endsWith("@s.whatsapp.net")) {
        const resolved = await safe(async () => {
            if (!conn.signalRepository?.lidMapping?.getLIDForPN) {
                return null;
            }
            return await conn.signalRepository.lidMapping.getLIDForPN(senderLid);
        });

        if (resolved) {
            return typeof resolved === "string" && resolved.endsWith("@lid")
                ? resolved.split("@")[0]
                : String(resolved).split("@")[0];
        }

        return senderLid.split("@")[0];
    }

    return senderLid.split("@")[0];
};

const getSettings = (jid) => {
    try {
        return global.db?.data?.settings?.[jid] || {};
    } catch {
        return {};
    }
};

const commandQueue = new PQueue({
    concurrency: 3,
    interval: 1000,
    intervalCap: 5,
    timeout: 120000, // 2 minutes
    throwOnTimeout: false,
});

const userRateLimits = new Map();

const RATE_LIMIT_WINDOW = 3000;
const MAX_COMMANDS_PER_WINDOW = 5;

const checkRateLimit = (userId) => {
    const now = Date.now();
    const userLimit = userRateLimits.get(userId);

    if (!userLimit) {
        userRateLimits.set(userId, { count: 1, timestamp: now });
        return true;
    }

    if (now - userLimit.timestamp > RATE_LIMIT_WINDOW) {
        userRateLimits.set(userId, { count: 1, timestamp: now });
        return true;
    }

    if (userLimit.count >= MAX_COMMANDS_PER_WINDOW) {
        return false;
    }

    userLimit.count++;
    return true;
};

const cleanupCaches = () => {
    const now = Date.now();

    try {
        for (const [userId, data] of userRateLimits.entries()) {
            if (now - data.timestamp > RATE_LIMIT_WINDOW) {
                userRateLimits.delete(userId);
            }
        }
    } catch {
        // ngapain dekk...
    }
};

setInterval(cleanupCaches, 30000);

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
    const userName = await safe(() => conn.getName(m.sender), "unknown");

    return conn.sendMessage(
        m.chat,
        {
            text: [
                `┌─[ACCESS DENIED]─────`,
                `│  Private chat is currently disabled.`,
                "└─────────────────────",
                `User   : ${userName}`,
                `Action : Blocked private access`,
                `Group  : ${global.config.group || "N/A"}`,
                "─────────────────────",
                "Join the group to continue using the bot.",
            ].join("\n"),
            contextInfo: {
                externalAdReply: {
                    title: "ACCESS DENIED",
                    body: global.config.watermark || "Bot",
                    mediaType: 1,
                    thumbnailUrl: "https://qu.ax/DdwBH.jpg",
                    renderLargerThumbnail: true,
                },
            },
        },
        { quoted: m }
    );
};

const traceError = async (connInstance, m, pluginRef, chatRef, e) => {
    const hideKeys = (s) => {
        if (!s) return s;
        let t = String(s);
        for (const key of Object.values(global.config.APIKeys || {})) {
            if (!key) continue;
            t = t.replace(new RegExp(escapeRegExp(key), "g"), "#HIDDEN#");
        }
        return t;
    };

    const ts = new Date().toISOString().replace("T", " ").split(".")[0];
    const text = hideKeys(String(e?.stack || e));

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

    return connInstance.sendMessage(
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

export async function handler(chatUpdate) {
    if (!chatUpdate) return;

    await safe(() => this.pushMessage(chatUpdate.messages));
    const last = chatUpdate.messages?.[chatUpdate.messages.length - 1];
    if (!last) return;

    let m = smsg(this, last) || last;
    if (m.isBaileys || m.isChannel || (m.key?.fromMe && !m.isCommand)) return;

    const settings = getSettings(this.user.jid);
    const senderLid = await resolveLID(m.sender);

    if (!senderLid) {
        this.logger?.warn("Could not resolve sender LID");
        return;
    }

    const devOwners = global.config.owner
        .filter(([id, , isDev]) => id && isDev)
        .map(([id]) => id.toString().split("@")[0]);
    const regOwners = global.config.owner
        .filter(([id, , isDev]) => id && !isDev)
        .map(([id]) => id.toString().split("@")[0]);

    const isMods = devOwners.includes(senderLid);
    const isOwner = isMods || regOwners.includes(senderLid);

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

    for (const name in global.plugins) {
        const plugin = global.plugins[name];
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

    if (!settings?.restrict) {
        const adminPlugins = Object.entries(global.plugins).filter(([, p]) =>
            p.tags?.includes("admin")
        );
        for (const [name] of adminPlugins) {
            delete global.plugins[name];
        }
    }

    const chat = global.db?.data?.chats?.[m.chat];

    if (!m.fromMe && settings?.self && !isMods && !isOwner) return;

    if (settings?.gconly && !m.isGroup && !isMods && !isOwner) {
        await sendDenied(this, m);
        return;
    }

    if (!isAdmin && !isMods && !isOwner && chat?.adminOnly) return;
    if (!isMods && !isOwner && chat?.mute) return;

    if (!isOwner && !isMods) {
        if (!checkRateLimit(m.sender)) {
            await safe(() => m.reply("Too many commands! Please slow down."));
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

    for (const name in global.plugins) {
        const plugin = global.plugins[name];
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

    if (targetPlugin.mods && !isMods) {
        fail("mods", m, this);
        return;
    }
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
        isMods,
        isOwner,
        isRAdmin,
        isAdmin,
        isBotAdmin,
        chatUpdate,
        __dirname: ___dirname,
        __filename: join(___dirname, targetName),
    };

    const connInstance = this;

    await commandQueue.add(async () => {
        try {
            await targetPlugin.call(connInstance, m, extra);

            if (typeof targetPlugin.after === "function") {
                await safe(() => targetPlugin.after.call(connInstance, m, extra));
            }
        } catch (e) {
            if (e?.message?.includes("Promise timed out") || e?.name === "TimeoutError") {
                connInstance.logger?.warn(`Task "${targetName}" timed out`);
                await safe(() =>
                    m.reply(`Task "${targetName}" timed out, please try again later.`)
                );
            } else {
                connInstance.logger?.error(e.message);
                if (settings?.noerror) {
                    await safe(() => m.reply(`Upss.. Something went wrong.`));
                } else {
                    await traceError(connInstance, m, targetName, m.chat, e);
                }
            }
        }
    });

    if (!getSettings(this.user.jid)?.noprint) {
        await safe(() => printMessage(m, this));
    }
}

const file = global.__filename(import.meta.url, true);
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
        if (reloadLock) {
            return;
        }

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
                instance.logger.error(e.message);
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
            instance.logger.error(error.message);
        }
    });
} catch (e) {
    console.error(e.message);
}

const cleanup = () => {
    if (isCleaningUp) {
        return;
    }
    isCleaningUp = true;

    try {
        if (watcher) {
            watcher.close();
        }

        commandQueue.clear();
        userRateLimits.clear();
    } catch (e) {
        console.error(e.message);
    }
};

process.once("SIGINT", cleanup);
process.once("SIGTERM", cleanup);
process.on("exit", (code) => {
    cleanup();
    console.log(`Process exiting with code: ${code}`);
});
