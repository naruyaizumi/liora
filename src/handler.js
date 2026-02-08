/**
 * @file WhatsApp message handler and command processor
 * @module core/handler
 * @description Main command handler for Liora bot - processes incoming messages,
 * validates permissions, executes plugins, and manages command routing.
 * @license Apache-2.0
 * @author Naruya Izumi
 */

import { smsg } from "#core/smsg.js";
import { join, dirname } from "node:path";

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

const getGroupMetadata = async (sock, chat) => {
    try {
        const chatData = await sock.getChat(chat);

        if (chatData?.metadata) {
            return chatData.metadata;
        }

        return chatData || {};
    } catch {
        return {};
    }
};

async function printMessage(
    m,
    sock = {
        user: {},
        decodeJid: (id) => id,
        getName: async () => "Unknown",
        logger: console,
    }
) {
    try {
        if (!m || !m.sender || !m.chat || !m.mtype) return;

        const sender = sock.decodeJid(m.sender);
        const chat = sock.decodeJid(m.chat);
        const user = (await sock.getName(sender)) || "Unknown";

        const getIdFormat = (id) => {
            if (id?.endsWith("@lid")) return "LID";
            if (id?.endsWith("@s.whatsapp.net")) return "PN";
            if (id?.startsWith("@")) return "Username";
            return "Unknown";
        };

        const getChatContext = (id) => {
            if (id?.endsWith("@g.us")) return "Group";
            if (id?.endsWith("@broadcast")) return "Broadcast";
            if (id?.endsWith("@newsletter")) return "Channel";
            if (id?.endsWith("@lid") || id?.endsWith("@s.whatsapp.net")) return "Private";
            return "Unknown";
        };

        const rawText = m.text?.trim() || "";
        const prefixMatch = rawText.match(/^([/!.])\s*(\S+)/);
        const prefix = m.prefix || (prefixMatch ? prefixMatch[1] : null);
        const command = m.command || (prefixMatch ? prefixMatch[2] : null);
        if (!prefix || !command) return;

        const cmd = `${prefix}${command}`;
        const idFormat = getIdFormat(sender);
        const chatContext = getChatContext(chat);

        global.logger.info(
            {
                user: user,
                sender: sender,
                idFormat: idFormat,
                chatContext: chatContext,
            },
            `${cmd} executed`
        );
    } catch {
        // Silent fail
    }
}

export async function handler(chatUpdate) {
    try {
        if (!chatUpdate) return;

        this.pushMessage(chatUpdate.messages);

        const messages = chatUpdate.messages;
        if (!messages || messages.length === 0) return;

        const m = smsg(this, messages[messages.length - 1]);
        if (!m || m.isBaileys || m.fromMe) return;

        const senderLid = m.sender ? m.sender.split("@")[0] : "";
        const regOwners = global.config.owner.map((id) => id.toString().split("@")[0]);
        const isOwner = m.fromMe || regOwners.includes(senderLid);

        if (!m.fromMe && global.config.self && !isOwner) {
            return;
        }

        let groupMetadata = {};
        let participants = [];
        let participantMap = {};
        let user = {};
        let bot = {};
        let isRAdmin = false;
        let isAdmin = false;
        let isBotAdmin = false;

        if (m.isGroup) {
            groupMetadata = await getGroupMetadata(this, m.chat);
            participants = groupMetadata?.participants || [];
            participantMap = Object.fromEntries(participants.map((p) => [p.id, p]));

            const botId = this.decodeJid(this.user.lid);
            user = participantMap[m.sender] || {};
            bot = participantMap[botId] || {};
            isRAdmin = user?.admin === "superadmin";
            isAdmin = isRAdmin || user?.admin === "admin";
            isBotAdmin = bot?.admin === "admin" || bot?.admin === "superadmin";
        }

        const __dirname = dirname(Bun.fileURLToPath(import.meta.url));
        const pluginDir = join(__dirname, "./plugins");

        let commandMatched = false;
        let matchedKey = null;

        for (const name in global.plugins) {
            const plugin = global.plugins[name];
            if (!plugin || plugin.disabled) continue;

            const __filename = join(pluginDir, name);

            if (typeof plugin.all === "function") {
                await safe(() =>
                    plugin.all.call(this, m, {
                        chatUpdate,
                        __dirname: pluginDir,
                        __filename,
                    })
                );
            }

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

                commandMatched = true;
                matchedKey = m.key;
                m.plugin = name;

                const fail = plugin.fail || global.dfail;

                if (plugin.owner && !isOwner) {
                    fail("owner", m, this);
                    continue;
                }

                if (plugin.group && !m.isGroup) {
                    fail("group", m, this);
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
                    sock: this,
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
                } catch {
                    await safe(() => m.reply("Something went wrong."));
                }

                break;
            }
        }

        await safe(() => printMessage(m, this));
    } catch {
        // Silent fail
    }
}