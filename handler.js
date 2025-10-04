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
import { canvas } from "./lib/canvas.js";

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
                if (!isNumber(user.lastseen)) user.lastseen = 0;
                if (!isNumber(user.command)) user.command = 0;
                if (!isNumber(user.commandTotal)) user.commandTotal = 0;
                if (!isNumber(user.commandLimit)) user.commandLimit = 200;
                if (!isNumber(user.cmdLimitMsg)) user.cmdLimitMsg = 0;
            } else
                global.db.data.users[m.sender] = {
                    lastseen: 0,
                    command: 0,
                    commandTotal: 0,
                    commandLimit: 1000,
                    cmdLimitMsg: 0,
                };
            let chat = global.db.data.chats[m.chat];
            if (typeof chat !== "object") global.db.data.chats[m.chat] = {};
            if (chat) {
                if (!("mute" in chat)) chat.mute = false;
                if (!("adminOnly" in chat)) chat.adminOnly = false;
                if (!("detect" in chat)) chat.detect = false;
                if (!("sWelcome" in chat)) chat.sWelcome = "";
                if (!("sBye" in chat)) chat.sBye = "";
                if (!("sPromote" in chat)) chat.sPromote = "";
                if (!("sDemote" in chat)) chat.sDemote = "";
                if (!("antiLinks" in chat)) chat.antiLinks = false;
                if (!("antiAudio" in chat)) chat.antiAudio = false;
                if (!("antiFile" in chat)) chat.antiFile = false;
                if (!("antiFoto" in chat)) chat.antiFoto = false;
                if (!("antiVideo" in chat)) chat.antiVideo = false;
                if (!("antiSticker" in chat)) chat.antiSticker = false;
                if (!("autoApprove" in chat)) chat.autoApprove = false;
                if (!("notifgempa" in chat)) chat.notifgempa = false;
                if (!("gempaDateTime" in chat)) chat.gempaDateTime = "";
                if (!("member" in chat)) chat.member = {};
            } else
                global.db.data.chats[m.chat] = {
                    mute: false,
                    adminOnly: false,
                    detect: false,
                    sWelcome: "",
                    sBye: "",
                    sPromote: "",
                    sDemote: "",
                    antiLinks: false,
                    antiAudio: false,
                    antiFile: false,
                    antiFoto: false,
                    antiVideo: false,
                    antiSticker: false,
                    autoApprove: false,
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
                if (!("restrict" in settings)) settings.restrict = false;
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
                    restrict: false,
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
            } else
                global.db.data.bots = {
                    users: {},
                    gempaDateTime: "",
                };
            let member = global.db.data.chats[m.chat].member[m.sender];
            if (typeof member !== "object") global.db.data.chats[m.chat].member[m.sender] = {};
            if (member) {
                if (!isNumber(member.command)) member.command = 0;
                if (!isNumber(member.commandTotal)) member.commandTotal = 0;
                if (!isNumber(member.lastseen)) member.lastseen = 0;
            } else
                global.db.data.chats[m.chat].member[m.sender] = {
                    command: 0,
                    commandTotal: 0,
                    lastseen: 0,
                };
        } catch (e) {
            console.error(e);
        }
        
const isMods = (
    await Promise.all(
        global.config.owner
            .filter(([number, _, isDeveloper]) => number && isDeveloper)
            .map(([number]) => number.replace(/[^0-9]/g, "") + "@s.whatsapp.net")
            .flatMap((pn) => [
                pn,
                conn.signalRepository.lidMapping.getLIDForPN(pn)
            ])
    )
).filter(Boolean).includes(m.sender)

const isOwner =
    m.fromMe ||
    isMods ||
    (
        await Promise.all(
            [
                ...global.config.owner
                    .filter(([number, _, isDeveloper]) => number && !isDeveloper)
                    .map(([number]) => number.replace(/[^0-9]/g, "") + "@s.whatsapp.net"),
                ...(global.config.newsletter || []),
            ].flatMap((pn) => [
                pn,
                conn.signalRepository.lidMapping.getLIDForPN(pn)
            ])
        )
    ).filter(Boolean).includes(m.sender)
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
        
const groupMetadata =
  (m.isGroup
    ? (conn.chats[m.chat] || {}).metadata ||
      (await this.groupMetadata(m.chat).catch(() => null))
    : {}) || {}

const participants = (m.isGroup ? groupMetadata.participants : []) || []

const senderId = conn.decodeJid(m.sender)
const botId    = conn.decodeJid(this.user.id)

const user = (m.isGroup
  ? participants.find((u) => conn.decodeJid(u.id) === senderId || conn.decodeJid(u.phoneNumber) === senderId)
  : {}) || {}
  
const bot = (m.isGroup
  ? participants.find((u) => conn.decodeJid(u.id) === botId || conn.decodeJid(u.phoneNumber) === botId)
  : {}) || {}

const isRAdmin   = user?.admin === "superadmin"
const isAdmin    = isRAdmin || user?.admin === "admin"
const isBotAdmin = bot?.admin === "admin" || bot?.admin === "superadmin"

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
                        text: `🍔 *Akses Ditolak!*
*Halo ${await conn.getName(m.sender)}* 🍞
🍕 *Maaf, chat pribadi saat ini dinonaktifkan.*
*Silakan gunakan bot ini di dalam grup atau hubungi Owner untuk info lebih lanjut.* 🍩

🍱 *Link Grup: ${global.config.group}*`,
                        contextInfo: {
                            externalAdReply: {
                                title: "🍡 ACCESS DENIED",
                                body: global.config.watermark,
                                mediaType: 1,
                                thumbnailUrl: "https://qu.ax/RtoXq.jpg",
                                renderLargerThumbnail: true,
                            },
                        },
                    });
                }
                if (m.chat in global.db.data.chats || m.sender in global.db.data.users) {
                    if (!(isAdmin || isMods || isOwner) && chat?.adminOnly) return;
                    if (!(isMods || isOwner) && chat?.mute) return;
                    if (user.command >= user.commandLimit && !(isOwner || isMods)) {
                        return conn.sendMessage(
                            m.chat,
                            {
                                text: `🍗 *Limit command kamu sudah habis!*
🍜 *${user.command} / ${user.commandLimit} digunakan.*
⏳ *Silakan tunggu hingga reset limit di jam 00.00 WIB!*`,
                                contextInfo: {
                                    externalAdReply: {
                                        title: "🍡 AKSES DITOLAK",
                                        body: global.config.watermark,
                                        mediaType: 1,
                                        thumbnailUrl: "https://qu.ax/RtoXq.jpg",
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
                if (setting.autoread) await this.readMessages([m.key]).catch(() => {});
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
                        m.reply("🍩 *Upss... ada sedikit error sistem nih~* 🍓");
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
                                        thumbnailUrl: "https://qu.ax/MtzsZ.jpg",
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
        
        let stats = global.db.data.stats;
if (m) {
    let stat;
    if (m.plugin) {
        let now = +new Date();
        if (m.plugin in stats) {
            stat = stats[m.plugin];
            if (!isNumber(stat.total)) stat.total = 1;
            if (!isNumber(stat.success)) stat.success = m.error != null ? 0 : 1;
            if (!isNumber(stat.last)) stat.last = now;
            if (!isNumber(stat.lastSuccess)) stat.lastSuccess = m.error != null ? 0 : now;
        } else {
            stat = stats[m.plugin] = {
                total: 1,
                success: m.error != null ? 0 : 1,
                last: now,
                lastSuccess: m.error != null ? 0 : now,
            };
        }
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
    }
}

export async function participantsUpdate({ id, participants, action }) {
    if (this.isInit) return;
    let chat = global.db.data.chats[id] || {};
    const groupMetadata = (await this.groupMetadata(id)) || (conn.chats[id] || {}).metadata;
    for (let user of participants) {
        let pp = await this.profilePictureUrl(user, "image").catch(() => "https://qu.ax/jVZhH.jpg");
        let img = await canvas(pp);
        let text = "";
        let title = "";
        let body = "";
        switch (action) {
            case "add":
                if (!chat.detect) return;
                text = (chat.sWelcome || this.welcome || conn.welcome || "Welcome, @user")
                    .replace("@subject", await this.getName(id))
                    .replace("@desc", groupMetadata.desc?.toString() || "unknow")
                    .replace("@user", "@" + user.split("@")[0]);
                title = "˚ ༘✦ ִֶ 𓂃⊹ 𝗦𝗲𝗹𝗮𝗺𝗮𝘁 𝗗𝗮𝘁𝗮𝗻𝗴 𝗞𝗮𝗸";
                body = `Kamu adalah member ke-${groupMetadata.participants.length}.`;
                await this.sendMessage(id, {
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
                break;

            case "remove":
                if (!chat.detect) return;
                text = (chat.sBye || this.bye || conn.bye || "Bye @user")
                    .replace("@subject", await this.getName(id))
                    .replace("@desc", groupMetadata.desc?.toString() || "unknow")
                    .replace("@user", "@" + user.split("@")[0]);
                title = "˚ ༘✦ ִֶ 𓂃⊹ 𝗦𝗲𝗹𝗮𝗺𝗮𝘁 𝗧𝗶𝗻𝗴𝗴𝗮𝗹 𝗞𝗮𝗸";
                body = `Kini grup berisi ${groupMetadata.participants.length} anggota.`;
                await this.sendMessage(id, {
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
                break;

            case "promote":
                if (!chat.detect) return;
                text = (
                    chat.sPromote ||
                    this.promote ||
                    conn.promote ||
                    "@user telah menjadi admin!"
                )
                    .replace("@subject", await this.getName(id))
                    .replace("@desc", groupMetadata.desc?.toString() || "unknow")
                    .replace("@user", "@" + user.split("@")[0]);
                title = "˚ ༘`✦ ˑ ִֶ 𓂃⊹ 𝗣𝗿𝗼𝗺𝗼𝘁𝗲 𝗞𝗮𝗸";
                body = global.config.watermark;
                await this.sendMessage(id, {
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
                break;

            case "demote":
                if (!chat.detect) return;
                text = (chat.sDemote || this.demote || conn.demote || "@user bukan admin lagi.")
                    .replace("@subject", await this.getName(id))
                    .replace("@desc", groupMetadata.desc?.toString() || "unknow")
                    .replace("@user", "@" + user.split("@")[0]);
                title = "˚ ༘`✦ ˑ ִֶ 𓂃⊹ 𝗗𝗲𝗺𝗼𝘁𝗲 𝗞𝗮𝗸";
                body = global.config.watermark;
                await this.sendMessage(id, {
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
                break;
        }
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