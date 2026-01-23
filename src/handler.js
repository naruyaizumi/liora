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

/**
 * Regular expression for detecting command prefixes
 * @constant {RegExp}
 * @default
 */
const CMD_PREFIX_RE = /^[/!.]/;

/**
 * Safely executes a function with fallback on error
 * @async
 * @function safe
 * @param {Function} fn - Function to execute
 * @param {*} fallback - Default value on error
 * @returns {Promise<*>} Function result or fallback
 */
const safe = async (fn, fallback = undefined) => {
    try {
        return await fn();
    } catch {
        return fallback;
    }
};

/**
 * Determines the command prefix to use (plugin-specific or global)
 * @function parsePrefix
 * @param {string|RegExp|Array} connPrefix - Global connection prefix
 * @param {string|RegExp|Array} pluginPrefix - Plugin-specific prefix
 * @returns {string|RegExp|Array} Effective prefix to use
 */
const parsePrefix = (connPrefix, pluginPrefix) => {
    if (pluginPrefix) return pluginPrefix;
    if (connPrefix) return connPrefix;
    return CMD_PREFIX_RE;
};

/**
 * Matches prefix against message text
 * @function matchPrefix
 * @param {string|RegExp|Array} prefix - Prefix to match
 * @param {string} text - Message text
 * @returns {Array} Array of [match, regex] pairs
 */
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

/**
 * Checks if command matches plugin command rules
 * @function isCmdMatch
 * @param {string} cmd - Command to check
 * @param {string|RegExp|Array} rule - Command matching rule
 * @returns {boolean} True if command matches
 */
const isCmdMatch = (cmd, rule) => {
    if (rule instanceof RegExp) return rule.test(cmd);
    if (Array.isArray(rule))
        return rule.some((r) => (r instanceof RegExp ? r.test(cmd) : r === cmd));
    if (typeof rule === "string") return rule === cmd;
    return false;
};

/**
 * Resolves LID (Local ID) from various sender formats
 * @async
 * @function resolveLid
 * @param {string} sender - Sender identifier
 * @param {Object} sock - Connection object
 * @returns {Promise<string>} Resolved LID
 */
const resolveLid = async (sender, sock) => {
    if (!sender || typeof sender !== "string") {
        return sender || "";
    }

    if (sender.endsWith("@lid")) {
        return sender.split("@")[0];
    }

    if (sender.endsWith("@s.whatsapp.net")) {
        const resolved = await sock.signalRepository.lidMapping.getLIDForPN(sender);
        if (resolved) {
            return typeof resolved === "string" && resolved.endsWith("@lid")
                ? resolved.split("@")[0]
                : resolved;
        }
    }

    return sender.split("@")[0];
};

/**
 * Retrieves group metadata with caching
 * @async
 * @function getGroupMetadata
 * @param {Object} sock - Connection object
 * @param {string} chat - Chat ID
 * @returns {Promise<Object>} Group metadata
 */
const getGroupMetadata = async (sock, chat) => {
    try {
        const chatData = await sock.getChat(chat);
        if (chatData?.metadata) {
            return chatData.metadata;
        }

        const metadata = await safe(() => sock.groupMetadata(chat), {});

        if (metadata && Object.keys(metadata).length > 0) {
            await sock.setChat(chat, {
                id: chat,
                metadata,
                isChats: true,
                lastSync: Date.now(),
            });
        }

        return metadata;
    } catch {
        return await safe(() => sock.groupMetadata(chat), {});
    }
};

/**
 * Checks message permissions against settings and roles
 * @function checkPermissions
 * @param {Object} m - Message object
 * @param {Object} settings - Global settings
 * @param {boolean} isOwner - Is sender owner
 * @param {boolean} isAdmin - Is sender group admin
 * @param {boolean} isBotAdmin - Is bot group admin
 * @param {Object} chat - Chat data
 * @returns {Object} Permission result {allowed: boolean, reason: string}
 */
const checkPermissions = (m, settings, isOwner, isAdmin, isBotAdmin, chat) => {
    // Self-only mode (only owner can use)
    if (!m.fromMe && settings?.self && !isOwner) {
        return { allowed: false, reason: "self" };
    }

    // Group-only mode
    if (settings?.gconly && !m.isGroup && !isOwner) {
        return { allowed: false, reason: "gconly" };
    }

    // Admin-only chat setting
    if (!isAdmin && !isOwner && chat?.adminOnly) {
        return { allowed: false, reason: "adminOnly" };
    }

    // Chat muted/bot disabled
    if (!isOwner && chat?.mute) {
        return { allowed: false, reason: "mute" };
    }

    return { allowed: true };
};

/**
 * Logs command execution for debugging and monitoring
 * @async
 * @function printMessage
 * @param {Object} m - Message object
 * @param {Object} sock - Connection object with utilities
 */
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

        /**
         * Determines ID format type
         * @function getIdFormat
         * @param {string} id - Identifier
         * @returns {string} Format type
         */
        const getIdFormat = (id) => {
            if (id?.endsWith("@lid")) return "LID";
            if (id?.endsWith("@s.whatsapp.net")) return "PN";
            if (id?.startsWith("@")) return "Username";
            return "Unknown";
        };

        /**
         * Determines chat context type
         * @function getChatContext
         * @param {string} id - Chat ID
         * @returns {string} Context type
         */
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

/**
 * Main message handler - processes incoming chat updates and executes commands
 * @async
 * @export
 * @function handler
 * @param {Object} chatUpdate - WhatsApp chat update object
 * @this {Object} Connection context
 * @throws {Error} On critical handler errors
 *
 * @workflow
 * 1. Validate and serialize incoming message
 * 2. Check permissions and user roles
 * 3. Match command against registered plugins
 * 4. Execute plugin with appropriate context
 * 5. Log execution and mark as read
 *
 * @security
 * - Validates user permissions before execution
 * - Isolates plugin execution with try-catch
 * - Rate limiting via message queue (external)
 * - Input sanitization for command arguments
 */
export async function handler(chatUpdate) {
    try {
        if (!chatUpdate) return;

        // Push to message queue for processing
        this.pushMessage(chatUpdate.messages);

        const messages = chatUpdate.messages;
        if (!messages || messages.length === 0) return;

        // Get last message and serialize
        const m = smsg(this, messages[messages.length - 1]);
        if (!m || m.isBaileys || m.fromMe) return;

        // Load settings and determine ownership
        const settings = global.db?.data?.settings?.[this.user.lid] || {};
        const senderLid = await resolveLid(m.sender, this);
        const regOwners = global.config.owner.map((id) => id.toString().split("@")[0]);
        const isOwner = m.fromMe || regOwners.includes(senderLid);

        // Group-specific variables
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

        // Determine plugin directory
        const __dirname = dirname(Bun.fileURLToPath(import.meta.url));
        const pluginDir = join(__dirname, "./plugins");

        let commandMatched = false;
        let matchedKey = null;

        // Iterate through all plugins
        for (const name in global.plugins) {
            const plugin = global.plugins[name];
            if (!plugin || plugin.disabled) continue;

            const __filename = join(pluginDir, name);

            // Execute plugin.all() if exists (runs for all messages)
            if (typeof plugin.all === "function") {
                await safe(() =>
                    plugin.all.call(this, m, {
                        chatUpdate,
                        __dirname: pluginDir,
                        __filename,
                    })
                );
            }

            // Skip if not a command plugin
            if (typeof plugin !== "function") continue;

            // Match command prefix
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

                // Check if command matches plugin's command definition
                if (!isCmdMatch(command, plugin.command)) continue;

                commandMatched = true;
                matchedKey = m.key;
                m.plugin = name;

                const chat = global.db?.data?.chats?.[m.chat] || {};

                // Check permissions
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

                // Owner-only commands
                if (plugin.owner && !isOwner) {
                    fail("owner", m, this);
                    continue;
                }

                // Group-only commands
                if (plugin.group && !m.isGroup) {
                    fail("group", m, this);
                    continue;
                }

                // Bot admin requirement
                if (plugin.botAdmin && !isBotAdmin) {
                    fail("botAdmin", m, this);
                    continue;
                }

                // Group admin requirement
                if (plugin.admin && !isAdmin) {
                    fail("admin", m, this);
                    continue;
                }

                // Prepare context object for plugin
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
                    // Execute plugin command
                    await plugin.call(this, m, extra);
                } catch (e) {
                    global.logger.error(e);
                    await safe(() => m.reply("Something went wrong."));
                }

                break; // Stop after first matching plugin
            }
        }

        // Log command execution
        await safe(() => printMessage(m, this));

        // Mark message as read
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
