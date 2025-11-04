/* global conn */
/* eslint no-unused-vars: ["error", { "argsIgnorePattern": "^_" }] */
import "./src/global.js";
import { smsg } from "./lib/core/smsg.js";
import { format } from "util";
import { fileURLToPath } from "url";
import path, { join } from "path";
import { watch } from "fs";
import printMessage from "./lib/utils/console.js";
import { canvas } from "./lib/utils/canvas.js";

const CMD_PREFIX_RE = /^[/!.]/;

/**
 * Safely executes an async function and returns fallback value on error
 * @param {Function} fn - Function to execute
 * @param {*} fallback - Value to return if function throws
 */
const safe = async (fn, fallback = undefined) => {
    try {
        return await fn();
    } catch {
        return fallback;
    }
};

/**
 * Retrieves settings for a specific JID (Jabber ID) from database
 * @param {string} jid - The unique identifier for user/group
 */
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
        for (const key of Object.values(global.config.APIKeys ||
            {})) {
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
        }, { quoted: m }
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
    
    let senderLid = m.sender;
    if (senderLid.endsWith("@lid")) {
        senderLid = senderLid.split("@")[0];
    } else if (senderLid.endsWith("@s.whatsapp.net")) {
        // Resolve phone number to LID if available
        const resolved = await conn.signalRepository.lidMapping.getLIDForPN(
            senderLid);
        if (resolved) {
            senderLid =
                typeof resolved === "string" && resolved.endsWith("@lid") ?
                resolved.split("@")[0] :
                resolved;
        } else {
            senderLid = senderLid.split("@")[0];
        }
    } else {
        senderLid = senderLid.split("@")[0];
    }
    
    const devOwners = global.config.owner
        .filter(([id, , isDev]) => id && isDev)
        .map(([id]) => id.toString().split("@")[0]);
    const regOwners = global.config.owner
        .filter(([id, , isDev]) => id && !isDev)
        .map(([id]) => id.toString().split("@")[0]);
    const isMods = devOwners.includes(senderLid);
    const isOwner = m.fromMe || isMods || regOwners.includes(senderLid);
    const groupMetadata = m.isGroup ?
        this.chats?.[m.chat]?.metadata || (await safe(() => this
            .groupMetadata(m.chat), null)) : {};
    const participants = groupMetadata?.participants || [];
    const map = Object.fromEntries(participants.map((p) => [p.id, p]));
    const senderId = m.sender;
    const botId = conn.decodeJid(conn.user.lid);
    const user = map[senderId] || {};
    const bot = map[botId] || {};
    const isRAdmin = user?.admin === "superadmin";
    const isAdmin = isRAdmin || user?.admin === "admin";
    const isBotAdmin = bot?.admin === "admin" || bot?.admin ===
        "superadmin";
    const ___dirname = path.join(path.dirname(fileURLToPath(import.meta
        .url)), "./plugins");
    
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
                    isMods,
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
            // Remove prefix from message
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
            if (!m.fromMe && settings?.self && !isMods && !isOwner) return;
            if (settings?.gconly && !m.isGroup && !isMods && !isOwner) {
                await sendDenied(this, m);
                return;
            }
            if (!isAdmin && !isMods && !isOwner && chat?.adminOnly) return;
            if (!isMods && !isOwner && chat?.mute) return;
            if (settings?.autoread) {
                await safe(() => this.readMessages([m.key]));
            }
            const fail = plugin.fail || global.dfail;
            if (plugin.mods && !isMods) {
                fail("mods", m, this);
                continue;
            }
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
                isMods,
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
    
    if (!getSettings(this.user.jid)?.noprint) {
        await safe(() => printMessage(m, this));
    }
}

export async function participantsUpdate({ id, participants, action }) {
    if (this.isInit) return;
    const conn = this;
    const chat = global.db.data.chats[id] || {};
    const groupMetadata = (await conn.groupMetadata(id)) || (conn.chats[
        id] || {}).metadata;
    if (!groupMetadata || !participants?.length) return;
    for (const u of participants) {
        const user = typeof u === "string" ? u : u?.id || "";
        if (!user) continue;
        if (!chat.detect) continue;
        const pp =
            (await conn.profilePictureUrl(user, "image").catch(() =>
                null)) ||
            "https://qu.ax/jVZhH.jpg";
        const img = await canvas(pp).catch(() => null);
        const groupName = await conn.getName(id);
        const desc = groupMetadata.desc?.toString() || "-";
        
        let text = "";
        let title = "";
        let body = "";
        
        switch (action) {
            case "add":
                text = (chat.sWelcome || conn.welcome || "Welcome, @user")
                    .replace("@subject", groupName)
                    .replace("@desc", desc)
                    .replace("@user", "@" + user.split("@")[0]);
                
                title = "[ SYSTEM NOTICE ] User Joined";
                body =
                    `+ Total members: ${groupMetadata.participants.length}`;
                break;
                
            case "remove":
                text = (chat.sBye || conn.bye || "Goodbye, @user")
                    .replace("@subject", groupName)
                    .replace("@desc", desc)
                    .replace("@user", "@" + user.split("@")[0]);
                
                title = "[ SYSTEM NOTICE ] User Left";
                body =
                    `- Members remaining: ${groupMetadata.participants.length}`;
                break;
                
            default:
                // skip
                continue;
        }
        
        await conn.sendMessage(id, {
            text: text.trim(),
            mentions: [user],
            contextInfo: {
                externalAdReply: {
                    title,
                    body,
                    thumbnail: img,
                    mediaType: 1,
                    renderLargerThumbnail: true,
                },
            },
        });
    }
}

export async function deleteUpdate({ id, keys }) {
    const conn = this
    if (!keys?.length || this.isInit) return

    for (const key of keys) {
        const chatId = key.remoteJid
        const msgId = key.id
        const chat = global.db.data.chats[id] || {};
        if (!chat.antidelete) continue;
        if (!conn.chats?.[chatId]?.messages) continue
        const deletedMsg = conn.chats[chatId].messages[msgId]
        if (!deletedMsg?.message) continue

        const m = deletedMsg.message

        const participant =
            key.participant ||
            deletedMsg.key?.participant ||
            deletedMsg.participant ||
            chatId

        let senderLid = participant
        if (senderLid.endsWith("@lid")) {
            senderLid = senderLid.split("@")[0]
        } else if (senderLid.endsWith("@s.whatsapp.net")) {
            const resolved = await conn.signalRepository.lidMapping.getLIDForPN(senderLid)
            if (resolved) {
                senderLid =
                    typeof resolved === "string" && resolved.endsWith("@lid")
                        ? resolved.split("@")[0]
                        : resolved
            } else {
                senderLid = senderLid.split("@")[0]
            }
        } else {
            senderLid = senderLid.split("@")[0]
        }

        const devOwners = global.config.owner
            .filter(([id, , isDev]) => id && isDev)
            .map(([id]) => id.toString().split("@")[0])
        const regOwners = global.config.owner
            .filter(([id, , isDev]) => id && !isDev)
            .map(([id]) => id.toString().split("@")[0])
        const isMods = devOwners.includes(senderLid)
        const isOwner = isMods || regOwners.includes(senderLid)
        if (
            key.fromMe ||
            participant?.includes(conn.user.lid.split(":")[0]) ||
            isOwner
        )
            continue

        const extractMentions = (text = "") => {
            const matches = [...text.matchAll(/@(\d{5,})/g)]
            const mentionedJid = matches.map(m => `${m[1]}@lid`)
            return mentionedJid.length > 0 ? { mentionedJid } : {}
        }

        const generateMessageID = () => {
            return Math.random().toString(36).substring(2, 10) + Date.now().toString(36)
        }

        const q = {
            key: {
                remoteJid: chatId,
                fromMe: false,
                id: generateMessageID(),
                participant
            },
            message: JSON.parse(JSON.stringify(deletedMsg.message))
        }

        const typeMap = {
            conversation: async () => {
                const text = m.conversation?.trim() || ""
                return {
                    text,
                    mentions: [participant],
                    contextInfo: extractMentions(text)
                }
            },
            extendedTextMessage: async () => {
                const text = m.extendedTextMessage?.text?.trim() || ""
                return {
                    text,
                    mentions: [participant],
                    contextInfo: extractMentions(text)
                }
            },
            imageMessage: async () => {
                const img = m.imageMessage
                const buffer = await conn.downloadM(img, "image")
                const caption = img?.caption?.trim() || ""
                return {
                    image: buffer,
                    caption,
                    mentions: [participant],
                    mimetype: img?.mimetype || "image/jpeg",
                    jpegThumbnail: img?.jpegThumbnail || null,
                    fileLength: img?.fileLength,
                    fileName: img?.fileName || "image.jpg",
                    contextInfo: extractMentions(caption)
                }
            },
            videoMessage: async () => {
                const vid = m.videoMessage
                const buffer = await conn.downloadM(vid, "video")
                const caption = vid?.caption?.trim() || ""
                return {
                    video: buffer,
                    caption,
                    mentions: [participant],
                    mimetype: vid?.mimetype || "video/mp4",
                    jpegThumbnail: vid?.jpegThumbnail || null,
                    seconds: vid?.seconds,
                    fileLength: vid?.fileLength,
                    fileName: vid?.fileName || "video.mp4",
                    contextInfo: extractMentions(caption)
                }
            },
            audioMessage: async () => {
                const aud = m.audioMessage
                const buffer = await conn.downloadM(aud, "audio")
                const mime = aud?.mimetype || "audio/mpeg"
                const isPtt = mime.includes("opus") || aud?.ptt
                return {
                    audio: buffer,
                    ptt: !!isPtt,
                    mimetype: mime,
                    mentions: [participant],
                    fileLength: aud?.fileLength || undefined,
                    seconds: aud?.seconds || undefined
                }
            },
            stickerMessage: async () => {
                const stk = m.stickerMessage
                const buffer = await conn.downloadM(stk, "sticker")
                return {
                    sticker: buffer,
                    mentions: [participant],
                    mimetype: stk?.mimetype || "image/webp"
                }
            },
            contactMessage: async () => {
                const c = m.contactMessage
                return {
                    contacts: {
                        displayName: c?.displayName || "Contact",
                        contacts: [c]
                    },
                    mentions: [participant]
                }
            },
            locationMessage: async () => {
                const loc = m.locationMessage
                return {
                    location: {
                        degreesLatitude: loc?.degreesLatitude,
                        degreesLongitude: loc?.degreesLongitude,
                        name: loc?.name,
                        address: loc?.address,
                        jpegThumbnail: loc?.jpegThumbnail || null
                    },
                    mentions: [participant]
                }
            },
            liveLocationMessage: async () => {
                const live = m.liveLocationMessage
                return {
                    location: {
                        degreesLatitude: live?.degreesLatitude,
                        degreesLongitude: live?.degreesLongitude,
                        accuracyInMeters: live?.accuracyInMeters,
                        speedInMps: live?.speedInMps,
                        caption: live?.caption || "",
                        jpegThumbnail: live?.jpegThumbnail || null
                    },
                    mentions: [participant]
                }
            }
        }

        try {
            const typeKey = Object.keys(m).find(k => typeMap[k])
            if (!typeKey) continue

            const payload = await typeMap[typeKey]()
            if (!payload) continue

            await conn.sendMessage(chatId, payload, { quoted: q })
        } catch (e) {
            conn.logger?.error?.(e)
            continue
        }
    }
}

const file = global.__filename(import.meta.url, true);
watch(file, async (eventType) => {
    if (eventType !== "change") return;
    conn.logger.info("handler.js updated — reloading modules");
    
    try {
        if (global.reloadHandler) await global.reloadHandler();
    } catch (e) {
        conn.logger.error(e);
    }
});