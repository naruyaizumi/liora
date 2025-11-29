/* global conn */
/* eslint no-unused-vars: ["error", { "argsIgnorePattern": "^_" }] */
import "#global";
import { smsg } from "../lib/core/smsg.js";
import path, { join } from "path";
import chokidar from "chokidar";
import printMessage from "../lib/console.js";

const CMD_PREFIX_RE = /^[/!.]/;

const safe = async (fn, fallback = undefined) => {
    try {
        return await fn();
    } catch {
        return fallback;
    }
};

const getSettings = (jid) => {
    try {
        return global.db?.data?.settings?.[jid] || {};
    } catch {
        return {};
    }
};

const parsePrefix = (connPrefix, pluginPrefix) => {
    if (pluginPrefix) return pluginPrefix;
    if (connPrefix) return connPrefix;
    return CMD_PREFIX_RE;
};

const matchPrefix = (prefix, text) => {
    if (prefix instanceof RegExp) return [
        [prefix.exec(text), prefix]
    ];
    
    if (Array.isArray(prefix)) {
        return prefix.map((p) => {
            const re =
                p instanceof RegExp ? p : new RegExp(p.replace(
                    /[|\\{}()[\]^$+*?.]/g, "\\$&"));
            return [re.exec(text), re];
        });
    }
    
    if (typeof prefix === "string") {
        const safe = prefix.replace(/[^a-zA-Z0-9_-]/g, "\\$&");
        const esc = new RegExp(`^${safe}`, "i");
        return [
            [esc.exec(text), esc]
        ];
    }
    
    return [
        [
            [], new RegExp()
        ]
    ];
};

const isCmdAccepted = (cmd, rule) => {
    if (rule instanceof RegExp) return rule.test(cmd);
    if (Array.isArray(rule))
        return rule.some((r) => (r instanceof RegExp ? r.test(cmd) : r ===
            cmd));
    if (typeof rule === "string") return rule === cmd;
    return false;
};

const resolveSenderLid = async (sender) => {
    let senderLid = sender;
    if (senderLid.endsWith("@lid")) {
        senderLid = senderLid.split("@")[0];
    } else if (senderLid.endsWith("@s.whatsapp.net")) {
        const resolved = await conn.signalRepository.lidMapping
            .getLIDForPN(senderLid);
        if (resolved) {
            senderLid =
                typeof resolved === "string" && resolved.endsWith(
                    "@lid") ?
                resolved.split("@")[0] :
                resolved;
        } else {
            senderLid = senderLid.split("@")[0];
        }
    } else {
        senderLid = senderLid.split("@")[0];
    }
    return senderLid;
};

const sendDenied = async (conn, m) => {
    const userName = await safe(() => conn.getName(m.sender),
    "unknown");
    
    return conn.sendMessage(
        m.chat,
        {
            text: [
                `┌─[ACCESS DENIED]────────────`,
                `│  Private chat is currently disabled.`,
                "└────────────────────────────",
                `User   : ${userName}`,
                `Action : Blocked private access`,
                `Group  : ${global.config.group}`,
                "────────────────────────────",
                "Join the group to continue using the bot.",
            ].join("\n"),
            contextInfo: {
                externalAdReply: {
                    title: "ACCESS DENIED",
                    body: global.config.watermark,
                    mediaType: 1,
                    thumbnailUrl: "https://qu.ax/DdwBH.jpg",
                    renderLargerThumbnail: true,
                },
            },
        }, { quoted: m }
    );
};

const traceError = async (conn, m, pluginRef, chatRef, e) => {
    const hideKeys = (s) => {
        if (!s) return s;
        let t = String(s);
        for (const key of Object.values(global.config.APIKeys || {})) {
            if (!key) continue;
            t = t.replace(new RegExp(key, "g"), "#HIDDEN#");
        }
        return t;
    };
    
    const ts = new Date().toISOString().replace("T", " ").split(".")[0];
    const text = hideKeys(Bun.inspect(e, { depth: null }));

    const msg = [
        `┌─[${ts}]─[ERROR]`,
        `│ Plugin : ${pluginRef}`,
        `│ ChatID : ${chatRef}`,
        "├─TRACEBACK────────────────────",
        ...text
            .trim()
            .split("\n")
            .map((line) => `│ ${line}`),
        "└──────────────────────────────",
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

class MessageTracker {
    constructor() {
        this.active = 0;
        this.shuttingDown = false;
    }

    async enter() {
        if (this.shuttingDown) {
            return false;
        }
        this.active++;
        return true;
    }

    exit() {
        this.active--;
        if (this.active < 0) this.active = 0;
    }

    async waitForCompletion(timeoutMs = 20000) {
        this.shuttingDown = true;
        const start = Date.now();
        
        while (this.active > 0) {
            if (Date.now() - start > timeoutMs) {
                conn.logger.warn(`Force shutdown: ${this.active} messages still processing`);
                break;
            }
            await new Promise(resolve => setTimeout(resolve, 100));
        }
    }

    getActive() {
        return this.active;
    }
}

const messageTracker = new MessageTracker();

if (global.cleanupTasks) {
    global.cleanupTasks.push(async () => {
        await messageTracker.waitForCompletion();
    });
}

export async function handler(chatUpdate) {
    const canProcess = await messageTracker.enter();
    if (!canProcess) {
        return;
    }

    try {
        if (!chatUpdate) return;
        
        this.pushMessage(chatUpdate.messages).catch(conn.logger.error);
        const last = chatUpdate.messages?.[chatUpdate.messages.length - 1];
        if (!last) return;
        
        let m = smsg(this, last) || last;
        if (m.isBaileys || m.fromMe) return;
        
        const settings = getSettings(this.user.lid);
        const senderLid = await resolveSenderLid(m.sender);
        const regOwners = global.config.owner.map(id => id.toString().split("@")[0]);
        const isOwner = m.fromMe || regOwners.includes(senderLid);
        
        const groupMetadata = m.isGroup ?
            this.chats?.[m.chat]?.metadata || (await safe(() => this
                .groupMetadata(m.chat), null)) :
            {};
        const participants = groupMetadata?.participants || [];
        const map = Object.fromEntries(participants.map((p) => [p.id, p]));
        const botId = conn.decodeJid(conn.user.lid);
        const user = map[m.sender] || {};
        const bot = map[botId] || {};
        const isRAdmin = user?.admin === "superadmin";
        const isAdmin = isRAdmin || user?.admin === "admin";
        const isBotAdmin = bot?.admin === "admin" || bot?.admin ===
        "superadmin";
        const ___dirname = path.join(path.dirname(Bun.fileURLToPath(import.meta
            .url)), "../plugins");
        
        for (const name in global.plugins) {
            const plugin = global.plugins[name];
            if (!plugin || plugin.disabled) continue;
            
            const __filename = join(___dirname, name);
            
            if (typeof plugin.before === "function") {
                try {
                    const stop = await plugin.before.call(this, m, {
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
                        filename: __filename,
                        dirname: ___dirname,
                    });
                    if (stop) continue;
                } catch (e) {
                    conn.logger.error(e);
                }
            }
            
            if (typeof plugin.all === "function") {
                await safe(() =>
                    plugin.all.call(this, m, {
                        chatUpdate,
                        __dirname: ___dirname,
                        __filename,
                    })
                );
            }
            
            if (!settings?.restrict && plugin.tags?.includes("admin")) continue;
            const prefix = parsePrefix(this.prefix, plugin.customPrefix);
            const body = typeof m.text === "string" ? m.text : "";
            const match = matchPrefix(prefix, body).find((p) => p[1]);
            if (typeof plugin !== "function") continue;
            
            let usedPrefix;
            if ((usedPrefix = (match?.[0] || "")[0])) {
                const noPrefix = body.replace(usedPrefix, "");
                const parts = noPrefix.trim().split(/\s+/);
                const [rawCmd, ...argsArr] = parts;
                const command = (rawCmd || "").toLowerCase();
                const _args = parts.slice(1);
                const text = _args.join(" ");
                const isAccept = isCmdAccepted(command, plugin.command);
                if (!isAccept) continue;
                m.plugin = name;
                const chat = global.db?.data?.chats?.[m.chat];
                if (!m.fromMe && settings?.self && !isOwner) return;
                if (settings?.gconly && !m.isGroup && !isOwner) {
                    await sendDenied(this, m);
                    return;
                }
                if (!isAdmin && !isOwner && chat?.adminOnly) return;
                if (!isOwner && chat?.mute) return;
                if (settings?.autoread) {
                    await safe(() => this.readMessages([m.key]));
                }
                const fail = plugin.fail || global.dfail;
                if (plugin.owner && !isOwner) {
                    fail("owner", m, this);
                    continue;
                }
                if (plugin.group && !m.isGroup) {
                    fail("group", m, this);
                    continue;
                }
                if (plugin.restrict) {
                    fail("restrict", m, this);
                    continue;
                }
                if (plugin.botAdmin && !isBotAdmin) {
                    fail("botAdmin", m, this);
                    continue;
                }
                if (plugin.admin && !isAdmin) {
                    fail("admin", m, this);
                    continue;
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
                    __filename,
                };
                
                await (async () => {
                    try {
                        await plugin.call(this, m, extra);
                    } catch (e) {
                        conn.logger.error(e);
                        if (e && settings?.noerror) {
                            await safe(() => m.reply(
                                `Upss.. Something went wrong.`));
                        } else if (e) {
                            await traceError(this, m, plugin, chat, e);
                        }
                    }
                })();
                
                if (typeof plugin.after === "function") {
                    await safe(() => plugin.after.call(this, m, extra));
                }
                
                break;
            }
        }
        
        if (!getSettings(this.user.lif)?.noprint) {
            await safe(() => printMessage(m, this));
        }
    } finally {
        messageTracker.exit();
    }
}

const __filename = Bun.fileURLToPath(import.meta.url);
let watcher = null;

function setupFileWatcher() {
    if (watcher) {
        watcher.close();
    }

    watcher = chokidar.watch(__filename, {
        persistent: true,
        ignoreInitial: true,
        awaitWriteFinish: {
            stabilityThreshold: 300,
            pollInterval: 100
        }
    });

    watcher.on('change', async (path) => {
        conn.logger.info(`handler.js changed at ${path} — reloading modules`);
        
        try {
            if (global.reloadHandler) {
                await global.reloadHandler();
            }
        } catch (e) {
            conn.logger.error(e);
        }
    });

    watcher.on('error', (error) => {
        conn.logger.error(error);
    });
}

setupFileWatcher();

if (global.cleanupTasks) {
    global.cleanupTasks.push(async () => {
        if (watcher) {
            await watcher.close();
        }
    });
}

export function getHandlerStatus() {
    return {
        activeMessages: messageTracker.getActive(),
        shuttingDown: messageTracker.shuttingDown
    };
}