/* global conn */
/* eslint no-unused-vars: ["error", { "argsIgnorePattern": "^_" }] */
import "#global";
import { smsg } from "./lib/core/smsg.js";
import { format } from "util";
import { fileURLToPath } from "url";
import path, { join } from "path";
import { watch } from "fs";
import printMessage from "./lib/console.js";

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
    if (prefix instanceof RegExp) return [[prefix.exec(text), prefix]];

    if (Array.isArray(prefix)) {
        return prefix.map((p) => {
            const re =
                p instanceof RegExp ? p : new RegExp(p.replace(/[|\\{}()[\]^$+*?.]/g, "\\$&"));
            return [re.exec(text), re];
        });
    }

    if (typeof prefix === "string") {
        const safe = prefix.replace(/[^a-zA-Z0-9_-]/g, "\\$&");
        const esc = new RegExp(`^${safe}`, "i");
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

const resolveSenderLid = async (sender) => {
    let senderLid = sender;
    if (senderLid.endsWith("@lid")) {
        senderLid = senderLid.split("@")[0];
    } else if (senderLid.endsWith("@s.whatsapp.net")) {
        const resolved = await conn.signalRepository.lidMapping.getLIDForPN(senderLid);
        if (resolved) {
            senderLid =
                typeof resolved === "string" && resolved.endsWith("@lid")
                    ? resolved.split("@")[0]
                    : resolved;
        } else {
            senderLid = senderLid.split("@")[0];
        }
    } else {
        senderLid = senderLid.split("@")[0];
    }
    return senderLid;
};

const sendDenied = async (conn, m) => {
    const userName = await safe(() => conn.getName(m.sender), "unknown");

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
        },
        { quoted: m }
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
    const text = hideKeys(format(e));

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

export async function handler(chatUpdate) {
    if (!chatUpdate) return;
    this.pushMessage(chatUpdate.messages).catch(conn.logger.error);
    const last = chatUpdate.messages?.[chatUpdate.messages.length - 1];
    if (!last) return;
    let m = smsg(this, last) || last;
    if (m.isBaileys || m.fromMe) return;

    const settings = getSettings(this.user.jid);

    const senderLid = await resolveSenderLid(m.sender);

    const regOwners = global.config.owner
        .filter(([id]) => id)
        .map(([id]) => id.toString().split("@")[0]);
    const isOwner = m.fromMe || regOwners.includes(senderLid);
    const groupMetadata = m.isGroup
        ? this.chats?.[m.chat]?.metadata || (await safe(() => this.groupMetadata(m.chat), null))
        : {};
    const participants = groupMetadata?.participants || [];
    const map = Object.fromEntries(participants.map((p) => [p.id, p]));
    const senderId = m.sender;
    const botId = conn.decodeJid(conn.user.lid);
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
                        await safe(() => m.reply(`Upss.. Something went wrong.`));
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

    if (!getSettings(this.user.jid)?.noprint) {
        await safe(() => printMessage(m, this));
    }
}

const __filename = fileURLToPath(import.meta.url);

watch(__filename, async (eventType) => {
    if (eventType !== "change") return;
    conn.logger.info("handler.js updated — reloading modules");

    try {
        if (global.reloadHandler) await global.reloadHandler();
    } catch (e) {
        conn.logger.error(e);
    }
});