/* global conn */ // eslint-disable-line no-unused-vars
/* eslint no-unused-vars: ["error", { "argsIgnorePattern": "^_" }] */
import "./global.js";
import { smsg } from "./lib/simple.js";
import { format } from "util";
import { fileURLToPath } from "url";
import path, { join } from "path";
import { watch } from "fs";
import chalk from "chalk";
import printMessage from "./lib/print.js";
import { canvas } from "./lib/canvas.js";

const CMD_PREFIX_RE = /^[/!.|•√§∆%✓&?]/;

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

const toJid = (n) => n.replace(/[^0-9]/g, "") + "@s.whatsapp.net";

const resolveOwners = async (conn, owners) => {
    const pns = owners.map(([num]) => toJid(num));
    const both = pns.flatMap((pn) => [pn, conn.signalRepository?.lidMapping?.getLIDForPN?.(pn)]);
    const resolved = await Promise.all(both);
    return resolved.filter(Boolean);
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

const sendAccessDenied = async (conn, m) => {
    const userName = await safe(() => conn.getName(m.sender), "unknown");
    return conn.sendMessage(
        m.chat,
        {
            text: [
                "```",
                `┌─[ACCESS DENIED]────────────`,
                `│  Private chat is currently disabled.`,
                "└────────────────────────────",
                `User   : ${userName}`,
                `Action : Blocked private access`,
                `Group  : ${global.config.group}`,
                "────────────────────────────",
                "Join the group to continue using the bot.",
                "```",
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

const reportPluginError = async (conn, m, pluginRef, chatRef, err) => {
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
    const text = hideKeys(format(err));

    const msg = [
        "```",
        `┌─[${ts}]─[ERROR]`,
        `│ Plugin : ${pluginRef}`,
        `│ ChatID : ${chatRef}`,
        "├─TRACEBACK────────────────────",
        ...text
            .trim()
            .split("\n")
            .map((line) => `│ ${line}`),
        "└──────────────────────────────",
        "```",
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
    this.pushMessage(chatUpdate.messages).catch(console.error);
    const last = chatUpdate.messages?.[chatUpdate.messages.length - 1];
    if (!last) return;
    let m = smsg(this, last) || last;
    if (m.isBaileys || m.fromMe) return;
    const settings = getSettings(this.user.jid);
    const devOwners = global.config.owner.filter(([n, , isDev]) => n && isDev);
    const regOwners = global.config.owner.filter(([n, , isDev]) => n && !isDev);
    const devList = await resolveOwners(this, devOwners);
    const regList = await resolveOwners(this, regOwners);
    const isMods = devList.includes(m.sender);
    const isOwner = m.fromMe || isMods || regList.includes(m.sender);
    const groupMetadata =
        (m.isGroup
            ? this.chats?.[m.chat]?.metadata || (await safe(() => this.groupMetadata(m.chat), null))
            : {}) || {};
    const participants = (m.isGroup ? groupMetadata.participants : []) || [];
    const senderId = this.decodeJid(m.sender);
    const botId = this.decodeJid(this.user.id);
    const user =
        (m.isGroup
            ? participants.find(
                  (u) =>
                      this.decodeJid(u.id) === senderId ||
                      this.decodeJid(u.phoneNumber) === senderId
              )
            : {}) || {};
    const bot =
        (m.isGroup
            ? participants.find(
                  (u) => this.decodeJid(u.id) === botId || this.decodeJid(u.phoneNumber) === botId
              )
            : {}) || {};
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
            if (!m.fromMe && settings?.self && !isMods && !isOwner) return;
            if (settings?.gconly && !m.isGroup && !isMods && !isOwner) {
                await sendAccessDenied(this, m);
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

            if (typeof plugin.before === "function") {
                const stop = await safe(() => plugin.before.call(this, m, extra), false);
                if (stop) continue;
            }

            await (async () => {
                try {
                    await plugin.call(this, m, extra);
                } catch (e) {
                    console.error(e);
                    if (e && settings?.noerror) {
                        await safe(() =>
                            m.reply(
                                `┌─[SYSTEM ERROR]──────
│  Something went wrong.
└──────────────────`
                            )
                        );
                    } else if (e) {
                        await reportPluginError(this, m, plugin, chat, e);
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
    const groupMetadata = (await conn.groupMetadata(id)) || (conn.chats[id] || {}).metadata;

    if (!groupMetadata || !participants?.length) return;

    for (const user of participants) {
        if (!chat.detect) continue;

        const pp =
            (await conn.profilePictureUrl(user, "image").catch(() => null)) ||
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
                body = `+ Total members: ${groupMetadata.participants.length}`;

                break;

            case "remove":
                text = (chat.sBye || conn.bye || "Goodbye, @user")
                    .replace("@subject", groupName)
                    .replace("@desc", desc)
                    .replace("@user", "@" + user.split("@")[0]);

                title = "[ SYSTEM NOTICE ] User Left";
                body = `- Members remaining: ${groupMetadata.participants.length}`;

                break;

            default:
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

const file = global.__filename(import.meta.url, true);
watch(file, async (eventType) => {
    if (eventType !== "change") return;
    console.log(chalk.cyan.bold("[ SYSTEM ] handler.js updated — reloading modules..."));
    try {
        if (global.reloadHandler) await global.reloadHandler();
    } catch (err) {
        console.error(chalk.red("[ SYSTEM ] Reload failed:"), err);
    }
});
