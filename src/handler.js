/* global conn */
/* eslint no-unused-vars: ["error", { "argsIgnorePattern": "^_" }] */
import { smsg } from "#core/smsg.js";
import { join, dirname } from "node:path";
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
                p instanceof RegExp ? p : new RegExp(p.replace(/[|\\{}()[\]^$+*?.]/g, "\\$&"));
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

export async function handler(chatUpdate) {
    try {
        if (!chatUpdate) return;

        this.pushMessage(chatUpdate.messages).catch(global.logger.error);

        const m = smsg(this, chatUpdate.messages?.[chatUpdate.messages.length - 1]);
        if (!m || m.isBaileys || m.fromMe) return;

        const settings = global.db?.data?.settings?.[this.user.lid] || {};
        const senderLid = await resolveLid(m.sender);
        const regOwners = global.config.owner.map((id) => id.toString().split("@")[0]);
        const isOwner = m.fromMe || regOwners.includes(senderLid);
        
        const groupMetadata = m.isGroup
            ? (await this.chats[m.chat])?.metadata || (await safe(() => this.groupMetadata(m.chat), {}))
            : {};
        const participants = groupMetadata?.participants || [];
        const participantMap = Object.fromEntries(participants.map((p) => [p.id, p]));
        const botId = this.decodeJid(this.user.lid);
        const user = participantMap[m.sender] || {};
        const bot = participantMap[botId] || {};
        const isRAdmin = user?.admin === "superadmin";
        const isAdmin = isRAdmin || user?.admin === "admin";
        const isBotAdmin = bot?.admin === "admin" || bot?.admin === "superadmin";

        const __dirname = dirname(Bun.fileURLToPath(import.meta.url));
        const pluginDir = join(__dirname, "./plugins");

        for (const name in global.plugins) {
            const plugin = global.plugins[name];
            if (!plugin || plugin.disabled) continue;

            const __filename = join(pluginDir, name);
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
                        __filename,
                        __dirname: pluginDir,
                    });
                    if (stop) continue;
                } catch (e) {
                    global.logger.error(e);
                }
            }

            if (typeof plugin.all === "function") {
                await safe(() =>
                    plugin.all.call(this, m, {
                        chatUpdate,
                        __dirname: pluginDir,
                        __filename,
                    })
                );
            }

            if (!settings?.restrict && plugin.tags?.includes("admin")) continue;

            if (typeof plugin !== "function") continue;

            const prefix = parsePrefix(this.prefix, plugin.customPrefix);
            const body = typeof m.text === "string" ? m.text : "";
            const match = matchPrefix(prefix, body).find((p) => p[1]);

            let usedPrefix;
            if ((usedPrefix = (match?.[0] || "")[0])) {
                const noPrefix = body.replace(usedPrefix, "");
                const parts = noPrefix.trim().split(/\s+/);
                const [rawCmd, ...argsArr] = parts;
                const command = (rawCmd || "").toLowerCase();
                const text = parts.slice(1).join(" ");

                if (!isCmdMatch(command, plugin.command)) continue;

                m.plugin = name;
                const chat = global.db?.data?.chats?.[m.chat] || {};

                if (!m.fromMe && settings?.self && !isOwner) return;

                if (settings?.gconly && !m.isGroup && !isOwner) {
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
                    args: argsArr,
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
                    __dirname: pluginDir,
                    __filename,
                };

                try {
                    await plugin.call(this, m, extra);
                } catch (e) {
                    global.logger.error(e);
                    await safe(() => m.reply("Something went wrong."));
                }

                if (typeof plugin.after === "function") {
                    await safe(() => plugin.after.call(this, m, extra));
                }

                break;
            }
        }

        if (!settings?.noprint) {
            await safe(() => printMessage(m, this));
        }
    } catch (e) {
        global.logger.error({ error: e.message, stack: e.stack }, "Handler error");
    }
}