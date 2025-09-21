/* global conn */
/* eslint no-unused-vars: ["error", { "argsIgnorePattern": "^_" }] */
import "./global.js";
import { smsg } from "./lib/simple.js";
import { format } from "util";
import { fileURLToPath } from "url";
import path, { join } from "path";
import { unwatchFile, watchFile } from "fs";
import chalk from "chalk";
import printMessage from "./lib/print.js";

const isNumber = (x) => typeof x === "number" && !isNaN(x);

export async function handler(chatUpdate) {
    this.msgqueque = this.msgqueque || [];
    if (!chatUpdate) return;
    this.pushMessage(chatUpdate.messages).catch(console.error);
    let m = chatUpdate.messages[chatUpdate.messages.length - 1];
    if (!m) return;
    if (global.db.data == null) await global.loadDatabase();
    try {
        m = smsg(this, m) || m;
        try {
            let user = global.db.data.users[m.sender];
            if (typeof user !== "object") global.db.data.users[m.sender] = {};
            if (user) {
                if (!isNumber(user.chat)) user.chat = 0;
                if (!isNumber(user.chatTotal)) user.chatTotal = 0;
                if (!isNumber(user.lastseen)) user.lastseen = 0;
                if (!("banned" in user)) user.banned = false;
                if (!isNumber(user.bannedTime)) user.bannedTime = 0;
                if (!isNumber(user.command)) user.command = 0;
                if (!isNumber(user.commandTotal)) user.commandTotal = 0;
                if (!isNumber(user.commandLimit)) user.commandLimit = 1000;
                if (!isNumber(user.cmdLimitMsg)) user.cmdLimitMsg = 0;
                if (!("premium" in user)) user.premium = false;
                if (!isNumber(user.premiumTime)) user.premiumTime = 0;
            } else
                global.db.data.users[m.sender] = {
                    chat: 0,
                    chatTotal: 0,
                    lastseen: 0,
                    banned: false,
                    bannedTime: 0,
                    command: 0,
                    commandTotal: 0,
                    commandLimit: 1000,
                    cmdLimitMsg: 0,
                    premium: false,
                    premiumTime: 0,
                };
            let chat = global.db.data.chats[m.chat];
            if (typeof chat !== "object") global.db.data.chats[m.chat] = {};
            if (chat) {
                if (!("isBanned" in chat)) chat.isBanned = false;
                if (!("isBannedTime" in chat)) chat.isBannedTime = false;
                if (!("mute" in chat)) chat.mute = false;
                if (!("adminOnly" in chat)) chat.adminOnly = false;
                if (!("detect" in chat)) chat.detect = false;
                if (!("sWelcome" in chat)) chat.sWelcome = "";
                if (!("sBye" in chat)) chat.sBye = "";
                if (!("sPromote" in chat)) chat.sPromote = "";
                if (!("sDemote" in chat)) chat.sDemote = "";
                if (!("otakuNews" in chat)) chat.otakuNews = false;
                if (!("otakuNow" in chat)) chat.otakuNow = "";
                if (!("antidelete" in chat)) chat.antidelete = false;
                if (!("antiLinks" in chat)) chat.antiLinks = false;
                if (!("antitagsw" in chat)) chat.antitagsw = false;
                if (!("antiAudio" in chat)) chat.antiAudio = false;
                if (!("antiFile" in chat)) chat.antiFile = false;
                if (!("antiFoto" in chat)) chat.antiFoto = false;
                if (!("antiVideo" in chat)) chat.antiVideo = false;
                if (!("antiSticker" in chat)) chat.antiSticker = false;
                if (!("autoApprove" in chat)) chat.autoApprove = false;
                if (!("teks" in chat)) chat.teks = true;
                if (!("notifgempa" in chat)) chat.notifgempa = false;
                if (!("gempaDateTime" in chat)) chat.gempaDateTime = "";
                if (!("member" in chat)) chat.member = {};
            } else
                global.db.data.chats[m.chat] = {
                    isBanned: false,
                    isBannedTime: false,
                    mute: false,
                    adminOnly: false,
                    detect: false,
                    sWelcome: "",
                    sBye: "",
                    sPromote: "",
                    sDemote: "",
                    otakuNews: false,
                    otakuNow: "",
                    antidelete: false,
                    antiLinks: false,
                    antitagsw: false,
                    antiAudio: false,
                    antiFile: false,
                    antiFoto: false,
                    antiVideo: false,
                    antiSticker: false,
                    autoApprove: false,
                    teks: true,
                    notifgempa: false,
                    gempaDateTime: "",
                    member: {},
                };
            let settings = global.db.data.settings[this.user.jid];
            if (typeof settings !== "object") global.db.data.settings[this.user.jid] = {};
            if (settings) {
                if (!("self" in settings)) settings.self = false;
                if (!("gconly" in settings)) settings.gconly = false;
                if (!("autoread" in settings)) settings.autoread = false;
                if (!("composing" in settings)) settings.composing = false;
                if (!("restrict" in settings)) settings.restrict = false;
                if (!("backup" in settings)) settings.backup = false;
                if (!("cleartmp" in settings)) settings.cleartmp = true;
                if (!("anticall" in settings)) settings.anticall = false;
                if (!("adReply" in settings)) settings.adReply = false;
                if (!("noprint" in settings)) settings.noprint = false;
                if (!("noerror" in settings)) settings.noerror = true;
            } else
                global.db.data.settings[this.user.jid] = {
                    self: false,
                    gconly: false,
                    autoread: false,
                    composing: false,
                    restrict: false,
                    backup: false,
                    cleartmp: true,
                    anticall: false,
                    adReply: false,
                    noprint: false,
                    noerror: true,
                };
            let bot = global.db.data.bots;
            if (typeof bot !== "object") global.db.data.bots = {};
            if (bot) {
                if (!("users" in bot)) bot.users = {};
                if (!("gempaDateTime" in bot)) bot.gempaDateTime = "";
                if (!("otakuNow" in bot)) bot.otakuNow = "";
            } else
                global.db.data.bots = {
                    users: {},
                    gempaDateTime: "",
                    otakuNow: "",
                };
            let member = global.db.data.chats[m.chat].member[m.sender];
            if (typeof member !== "object") global.db.data.chats[m.chat].member[m.sender] = {};
            if (member) {
                if (!("blacklist" in member)) member.blacklist = false;
                if (!isNumber(member.blacklistTime)) member.blacklistTime = 0;
                if (!isNumber(member.chat)) member.chat = 0;
                if (!isNumber(member.chatTotal)) member.chatTotal = 0;
                if (!isNumber(member.command)) member.command = 0;
                if (!isNumber(member.commandTotal)) member.commandTotal = 0;
                if (!isNumber(member.lastseen)) member.lastseen = 0;
            } else
                global.db.data.chats[m.chat].member[m.sender] = {
                    blacklist: false,
                    blacklistTime: 0,
                    chat: 0,
                    chatTotal: 0,
                    command: 0,
                    commandTotal: 0,
                    lastseen: 0,
                };
        } catch (e) {
            console.error(e);
        }
        const isMods = global.config.owner
            .filter(([number, _, isDeveloper]) => number && isDeveloper)
            .map(([number]) => number)
            .map((v) => v.replace(/[^0-9]/g, "") + "@s.whatsapp.net")
            .includes(m.sender);
        const isOwner =
            m.fromMe ||
            isMods ||
            [
                ...global.config.owner
                    .filter(([number, _, isDeveloper]) => number && !isDeveloper)
                    .map(([number]) => number.replace(/[^0-9]/g, "") + "@s.whatsapp.net"),
            ].includes(m.sender);
        const isPrems = isOwner || new Date() - global.db.data.users[m.sender].premiumTime < 0;
        const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
        if (global.db.data.settings[this.user.jid]?.queque && m.text && !(isMods || isOwner)) {
            let queque = this.msgqueque;
            let time = 5000;
            const previousID = queque[queque.length - 1];
            queque.push(m.id || m.key.id);
            const check = setInterval(async () => {
                if (queque.indexOf(previousID) === -1) {
                    clearInterval(check);
                }
                await delay(time);
            }, time);
        }
        if (m.isBaileys || m.fromMe) return;
        m.exp += Math.ceil(Math.random() * 10);
        let usedPrefix;
        let _chat = global.db.data && global.db.data.chats && global.db.data.chats[m.chat];
        const groupMetadata =
            (m.isGroup
                ? (conn.chats[m.chat] || {}).metadata ||
                  (await this.groupMetadata(m.chat).catch((_) => null))
                : {}) || {};
        const participants = (m.isGroup ? groupMetadata.participants : []) || [];
        const user =
            (m.isGroup ? participants.find((u) => conn.decodeJid(u.id) === m.sender) : {}) || {};
        const bot =
            (m.isGroup ? participants.find((u) => conn.decodeJid(u.id) == this.user.jid) : {}) ||
            {};
        const isRAdmin = user?.admin == "superadmin" || false;
        const isAdmin = isRAdmin || user?.admin == "admin" || false;
        const isBotAdmin = bot?.admin || false;
        const isBlacklist = m.isGroup
            ? Object.entries(_chat.member).find((v) => v[1].blacklist && v[0] == m.sender)
            : false;
        const ___dirname = path.join(path.dirname(fileURLToPath(import.meta.url)), "./plugins");
        for (let name in global.plugins) {
            let plugin = global.plugins[name];
            if (!plugin) continue;
            if (plugin.disabled) continue;
            const __filename = join(___dirname, name);
            if (typeof plugin.all === "function") {
                try {
                    await plugin.all.call(this, m, {
                        chatUpdate,
                        __dirname: ___dirname,
                        __filename,
                    });
                } catch (e) {
                    console.error(e);
                }
            }
            if (!global.db.data.settings[this.user.jid]?.restrict) {
                if (plugin.tags && plugin.tags.includes("admin")) {
                    continue;
                }
            }
            const prefix = new RegExp("^[\\/!.|•√§∆%✓&\\?]");
            let _prefix = plugin.customPrefix
                ? plugin.customPrefix
                : conn.prefix
                  ? conn.prefix
                  : prefix;
            let match = (
                _prefix instanceof RegExp
                    ? [[_prefix.exec(m.text), _prefix]]
                    : Array.isArray(_prefix)
                      ? _prefix.map((p) => {
                            let re =
                                p instanceof RegExp
                                    ? p
                                    : new RegExp(p.replace(/[|\\{}()[\]^$+*?.]/g, "\\$&"));
                            return [re.exec(m.text), re];
                        })
                      : typeof _prefix === "string"
                        ? [
                              [
                                  new RegExp(_prefix.replace(/[|\\{}()[\]^$+*?.]/g, "\\$&")).exec(
                                      m.text
                                  ),
                                  new RegExp(_prefix.replace(/[|\\{}()[\]^$+*?.]/g, "\\$&")),
                              ],
                          ]
                        : [[[], new RegExp()]]
            ).find((p) => p[1]);
            if (typeof plugin.before === "function") {
                if (
                    await plugin.before.call(this, m, {
                        match,
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
                        isPrems,
                        chatUpdate,
                        __dirname: ___dirname,
                        __filename,
                    })
                )
                    continue;
            }
            if (typeof plugin !== "function") continue;
            if ((usedPrefix = (match[0] || "")[0])) {
                let noPrefix = m.text.replace(usedPrefix, "");
                let [command, ...args] = noPrefix.trim().split` `.filter((v) => v);
                args = args || [];
                let _args = noPrefix.trim().split` `.slice(1);
                let text = _args.join(" ");
                command = (command || "").toLowerCase();
                let fail = plugin.fail || global.dfail;
                let isAccept =
                    plugin.command instanceof RegExp
                        ? plugin.command.test(command)
                        : Array.isArray(plugin.command)
                          ? plugin.command.some((cmd) =>
                                cmd instanceof RegExp ? cmd.test(command) : cmd === command
                            )
                          : typeof plugin.command === "string"
                            ? plugin.command === command
                            : false;
                if (!isAccept) continue;
                m.plugin = name;
                let user = global.db.data.users[m.sender];
                let chat = global.db.data.chats[m.chat];
                let setting = global.db.data.settings[this.user.jid];
                if (typeof m.text !== "string") m.text = "";
                if (
                    !m.fromMe &&
                    global.db.data.settings[this.user.jid]?.self &&
                    !isMods &&
                    !isOwner
                )
                    return;
                if (
                    global.db.data.settings[this.user.jid]?.gconly &&
                    !m.isGroup &&
                    !isMods &&
                    !isOwner
                ) {
                    return conn.sendMessage(m.chat, {
                        text: `🍔 *Access Denied!*
*Hello ${await conn.getName(m.sender)}* 🍞
🍕 *Sorry, private chat is currently disabled.*
*Please use this bot in group or contact Owner for more info.* 🍩

🍱 *Group Link: ${global.config.group}*`,
                        contextInfo: {
                            externalAdReply: {
                                title: "🍡 ACCESS DENIED",
                                body: global.config.watermark,
                                mediaType: 1,
                                thumbnailUrl:
                                    "https://files.cloudkuimages.guru/images/s35pERld.jpg",
                                renderLargerThumbnail: true,
                            },
                        },
                    });
                }
                if (m.chat in global.db.data.chats || m.sender in global.db.data.users) {
                    if (
                        name != "group-info.js" &&
                        !(isAdmin || isMods || isOwner) &&
                        chat?.adminOnly
                    )
                        return;
                    if (
                        name != "group-modebot.js" &&
                        name != "owner-unbanchat.js" &&
                        name != "owner-exec.js" &&
                        name != "owner-exec2.js" &&
                        name != "tool-delete.js" &&
                        !(isMods || isOwner) &&
                        (chat?.isBanned || chat?.mute)
                    )
                        return;
                    if (
                        name != "owner-unbanuser.js" &&
                        name != "info-cekbanned.js" &&
                        !(isMods || isOwner) &&
                        user?.banned
                    )
                        return;
                    if (name != "group-listblacklist.js" && !(isMods || isOwner) && isBlacklist)
                        return;
                    if (user.command >= user.commandLimit && !isPrems && !(isOwner || isMods)) {
                        return conn.sendMessage(
                            m.chat,
                            {
                                text: `🍗 *Limit command kamu sudah habis!*
🍜 *${user.command} / ${user.commandLimit} digunakan.*
⏳ *Silakan tunggu hingga reset limit di jam 00.00 WIB!*
🍰 *Upgrade ke Premium untuk Unlimited Limit!*`,
                                contextInfo: {
                                    externalAdReply: {
                                        title: "🍡 AKSES DITOLAK",
                                        body: global.config.watermark,
                                        mediaType: 1,
                                        thumbnailUrl:
                                            "https://files.cloudkuimages.guru/images/geNCoIsW.jpg",
                                        renderLargerThumbnail: true,
                                    },
                                },
                            },
                            { quoted: m }
                        );
                    }
                    if (m.isGroup) {
                        chat.member[m.sender].command++;
                        chat.member[m.sender].commandTotal++;
                        chat.member[m.sender].lastCmd = Date.now();
                    }
                    user.command++;
                    user.commandTotal++;
                    user.lastCmd = Date.now();
                }
                if (setting.composing)
                    await this.sendPresenceUpdate("composing", m.chat).catch(() => {});
                if (setting.autoread) await this.readMessages([m.key]).catch(() => {});
                if (plugin.mods && !isMods) {
                    fail("mods", m, this);
                    continue;
                }
                if (plugin.owner && !isOwner) {
                    fail("owner", m, this);
                    continue;
                }
                if (plugin.premium && !isPrems) {
                    fail("premium", m, this);
                    continue;
                }
                if (plugin.group && !m.isGroup) {
                    fail("group", m, this);
                    continue;
                } else if (plugin.restrict) {
                    fail("restrict", m, this);
                    continue;
                } else if (plugin.botAdmin && !isBotAdmin) {
                    fail("botAdmin", m, this);
                    continue;
                } else if (plugin.admin && !isAdmin) {
                    fail("admin", m, this);
                    continue;
                }
                let extra = {
                    match,
                    usedPrefix,
                    noPrefix,
                    _args,
                    args,
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
                    isPrems,
                    chatUpdate,
                    __dirname: ___dirname,
                    __filename,
                };
                try {
                    await plugin.call(this, m, extra);
                } catch (e) {
                    m.error = e;
                    console.error(e);
                    if (e && setting.noerror) {
                        m.reply("[SYSTEM ERROR] A critical failure has occurred.");
                    } else if (e) {
                        let text = format(e);
                        for (let key of Object.values(global.config.APIKeys))
                            text = text.replace(new RegExp(key, "g"), "#HIDDEN#");
                        let errorMsg = `
*╭─❖ 「 💥 Plugin Error Detected! 」*
*│ 📛 Plugin: ${m.plugin}*
*│ 🙋 Sender: ${m.sender}*
*│ 💬 Chat: ${m.chat}*
*│ 📝 Command: ${usedPrefix}${command} ${args.join(" ")}*
*╰────────────────────*

*「 📄 Error Logs 」*
\`\`\`
${text}
\`\`\`
━━━━━━━━━━━━━━━━━━━━━━
`.trim();
                        await conn.sendMessage(
                            m.chat,
                            {
                                text: errorMsg,
                                contextInfo: {
                                    externalAdReply: {
                                        title: "💥 Plugin Error Detected!",
                                        body: "📄 Lihat log error di atas",
                                        mediaType: 1,
                                        thumbnailUrl:
                                            "https://files.cloudkuimages.guru/images/DqOJlT4iNQJP.jpg",
                                        renderLargerThumbnail: true,
                                    },
                                },
                            },
                            { quoted: m }
                        );
                    }
                } finally {
                    if (typeof plugin.after === "function") {
                        try {
                            await plugin.after.call(this, m, extra);
                        } catch (e) {
                            console.error(e);
                        }
                    }
                }
                break;
            }
        }
    } catch (e) {
        console.error(e);
    } finally {
        if (global.db.data.settings[this.user.jid]?.queque && m.text) {
            const quequeIndex = this.msgqueque.indexOf(m.id || m.key.id);
            if (quequeIndex !== -1) this.msgqueque.splice(quequeIndex, 1);
        }
        let user,
            stats = global.db.data.stats;
        if (m) {
            if (m.sender) user = global.db.data.users[m.sender];
            let stat;
            if (m.plugin) {
                let now = +new Date();
                if (m.plugin in stats) {
                    stat = stats[m.plugin];
                    if (!isNumber(stat.total)) stat.total = 1;
                    if (!isNumber(stat.success)) stat.success = m.error != null ? 0 : 1;
                    if (!isNumber(stat.last)) stat.last = now;
                    if (!isNumber(stat.lastSuccess)) stat.lastSuccess = m.error != null ? 0 : now;
                } else
                    stat = stats[m.plugin] = {
                        total: 1,
                        success: m.error != null ? 0 : 1,
                        last: now,
                        lastSuccess: m.error != null ? 0 : now,
                    };
                stat.total += 1;
                stat.last = now;
                if (m.error == null) {
                    stat.success += 1;
                    stat.lastSuccess = now;
                }
            }
        }
        try {
            if (!global.db.data.settings[this.user.jid]?.noprint) {
                await printMessage(m, this);
            }
        } catch (e) {
            console.log(m, m.quoted, e);
        }
        let chat = global.db.data.chats[m.chat];
        user.chat++;
        user.chatTotal++;
        user.lastseen = Date.now();
        if (m.isGroup) {
            chat.member[m.sender].chat++;
            chat.member[m.sender].chatTotal++;
            chat.member[m.sender].lastseen = Date.now();
        }
    }
}

export async function participantsUpdate({ id, participants, action }) {
    if (global.db.data.settings[this.user.jid]?.self) return;
    if (this.isInit) return;
    let chat = global.db.data.chats[id] || {};
    if (!chat.detect) return;
    let groupMetadata = (await this.groupMetadata(id)) || (conn.chats[id] || {}).metadata;
    for (let user of participants) {
        let name = await this.getName(user);
        let pp = await this.profilePictureUrl(user, "image").catch(
            (_) => "https://cloudkuimages.guru/uploads/images/pg5XDGVr.jpg"
        );
        let userTag = "@" + user.split("@")[0];
        let text = "";
        let msgOptions = {};
        switch (action) {
            case "add": {
                text = chat.sWelcome || this.welcome || conn.welcome || "Welcome, @user";
                text = text
                    .replace("@subject", await this.getName(id))
                    .replace("@desc", groupMetadata.desc?.toString() || "unknown")
                    .replace("@user", userTag);
                let memberCount = groupMetadata.participants.length;
                msgOptions = {
                    image: { url: pp },
                    caption: text.trim(),
                    title: "˚ ༘✦ ִֶ 𓂃⊹ 𝗦𝗲𝗹𝗮𝗺𝗮𝘁 𝗗𝗮𝘁𝗮𝗻𝗴 𝗞𝗮𝗸",
                    footer: `Kamu adalah member ke-${memberCount}.`,
                    interactiveButtons: [
                        {
                            name: "quick_reply",
                            buttonParamsJson: JSON.stringify({
                                display_text: "🌥️ Intro Sekarang",
                                id: ".intro",
                            }),
                        },
                    ],
                    mentions: [user],
                    hasMediaAttachment: false,
                };
                break;
            }
            case "remove": {
                text = chat.sBye || this.bye || conn.bye || "Bye @user";
                text = text
                    .replace("@subject", await this.getName(id))
                    .replace("@desc", groupMetadata.desc?.toString() || "unknown")
                    .replace("@user", userTag);
                let memberCount = groupMetadata.participants.length;
                msgOptions = {
                    image: { url: pp },
                    caption: text.trim(),
                    title: "˚ ༘✦ ִֶ 𓂃⊹ 𝗦𝗲𝗹𝗮𝗺𝗮𝘁 𝗧𝗶𝗻𝗴𝗴𝗮𝗹 𝗞𝗮𝗸",
                    footer: `Kini grup berisi ${memberCount} anggota.`,
                    interactiveButtons: [
                        {
                            name: "cta_url",
                            buttonParamsJson: JSON.stringify({
                                display_text: `${name} 💔`,
                                url: `https://wa.me/${user.replace("@s.whatsapp.net", "")}`,
                                merchant_url: `https://wa.me/${user.replace("@s.whatsapp.net", "")}`,
                            }),
                        },
                    ],
                    mentions: [user],
                    hasMediaAttachment: false,
                };
                break;
            }
            case "promote": {
                text =
                    chat.sPromote ||
                    this.promote ||
                    conn.promote ||
                    "@user has been promoted as admin!";
                text = text
                    .replace("@subject", await this.getName(id))
                    .replace("@desc", groupMetadata.desc?.toString() || "unknown")
                    .replace("@user", userTag);
                msgOptions = {
                    text: text.trim(),
                    contextInfo: {
                        mentionedJid: [user],
                        externalAdReply: {
                            title: "˚ ༘✦ ִֶ 𓂃⊹ 𝗣𝗿𝗼𝗺𝗼𝘁𝗲",
                            body: global.config.watermark,
                            thumbnailUrl: pp,
                            sourceUrl: global.config.group || "",
                            mediaType: 1,
                            renderLargerThumbnail: true,
                        },
                    },
                };
                break;
            }
            case "demote": {
                text = chat.sDemote || this.demote || conn.demote || "@user is no longer an admin.";
                text = text
                    .replace("@subject", await this.getName(id))
                    .replace("@desc", groupMetadata.desc?.toString() || "unknown")
                    .replace("@user", userTag);
                msgOptions = {
                    text: text.trim(),
                    contextInfo: {
                        mentionedJid: [user],
                        externalAdReply: {
                            title: "˚ ༘✦ ִֶ 𓂃⊹ 𝗗𝗲𝗺𝗼𝘁𝗲",
                            body: global.config.watermark,
                            thumbnailUrl: pp,
                            sourceUrl: global.config.group || "",
                            mediaType: 1,
                            renderLargerThumbnail: true,
                        },
                    },
                };
                break;
            }
        }
        await this.sendMessage(id, msgOptions);
    }
}

export async function deleteUpdate(message) {
    if (!message) return;
    const { fromMe, id, participant, remoteJid: chat } = message;
    if (fromMe) return;
    const chatData = global.db.data.chats[chat] || {};
    if (!chatData.antidelete) return;
    const deletedMsg = this.loadMessage?.(id);
    if (!deletedMsg) return;
    let note = {
        key: {
            fromMe: false,
            participant: participant,
            ...(chat ? { remoteJid: chat } : {}),
        },
        message: {
            conversation: `"˚ ༘✦ ˑ ִֶ 𓂃⊹ 𝗔𝗻𝘁𝗶 𝗗𝗲𝗹𝗲𝘁𝗲 𝗠𝗲𝘀𝘀𝗮𝗴𝗲\n*@${participant.split("@")[0]} :*`,
        },
    };
    await this.copyNForward(chat, deletedMsg, true, {
        quoted: note,
        mentions: [participant],
    });
}

let file = global.__filename(import.meta.url, true);
watchFile(file, async () => {
    unwatchFile(file);
    console.log(chalk.cyan.bold("🌸 Aku sedang memperbarui handler.js. Tunggu sebentar, ya!"));
    if (global.reloadHandler) console.log(await global.reloadHandler());
});
