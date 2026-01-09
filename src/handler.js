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

const resolveLid = async (sender, conn) => {
    if (!sender || typeof sender !== "string") {
        return sender || "";
    }

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

const getGroupMetadata = async (conn, chat) => {
    try {
        const chatData = await conn.getChat(chat);
        if (chatData?.metadata) {
            return chatData.metadata;
        }

        const metadata = await safe(() => conn.groupMetadata(chat), {});

        if (metadata && Object.keys(metadata).length > 0) {
            await conn.setChat(chat, {
                id: chat,
                metadata,
                isChats: true,
                lastSync: Date.now(),
            });
        }

        return metadata;
    } catch {
        return await safe(() => conn.groupMetadata(chat), {});
    }
};

const checkPermissions = (m, settings, isOwner, isAdmin, isBotAdmin, chat) => {
    if (!m.fromMe && settings?.self && !isOwner) {
        return { allowed: false, reason: "self" };
    }

    if (settings?.gconly && !m.isGroup && !isOwner) {
        return { allowed: false, reason: "gconly" };
    }

    if (!isAdmin && !isOwner && chat?.adminOnly) {
        return { allowed: false, reason: "adminOnly" };
    }

    if (!isOwner && chat?.mute) {
        return { allowed: false, reason: "mute" };
    }

    return { allowed: true };
};

async function printMessage(
    m,
    conn = {
        user: {},
        decodeJid: (id) => id,
        getName: async () => "Unknown",
        logger: console,
    }
) {
    try {
        if (global.db?.data?.settings?.[conn.user?.lid]?.noprint) return;
        if (!m || !m.sender || !m.chat || !m.mtype) return;

        const sender = conn.decodeJid(m.sender);
        const chat = conn.decodeJid(m.chat);
        const user = (await conn.getName(sender)) || "Unknown";

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
    } catch (e) {
        global.logger.error(e);
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

        const settings = global.db?.data?.settings?.[this.user.lid] || {};
        const senderLid = await resolveLid(m.sender, this);
        const regOwners = global.config.owner.map((id) => id.toString().split("@")[0]);
        const isOwner = m.fromMe || regOwners.includes(senderLid);

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

                const chat = global.db?.data?.chats?.[m.chat] || {};

                const permission = checkPermissions(
                    m,
                    settings,
                    isOwner,
                    isAdmin,
                    isBotAdmin,
                    chat
                );
                if (!permission.allowed) {
                    break;
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

                break;
            }
        }

        await safe(() => printMessage(m, this));

        if (commandMatched && matchedKey) {
            setImmediate(async () => {
                try {
                    await this.readMessages([matchedKey]);
                } catch (e) {
                    global.logger?.error({ error: e.message }, "Read message error");
                }
            });
        }
    } catch (e) {
        global.logger.error({ error: e.message, stack: e.stack }, "Handler error");
    }
}
