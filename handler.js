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

export async function handler(chatUpdate) {
  this.msgqueque = this.msgqueque || [];
  if (!chatUpdate) return;
  this.pushMessage(chatUpdate.messages).catch(console.error);
  let m = chatUpdate.messages[chatUpdate.messages.length - 1];
  if (!m) return;
  try {
    m = smsg(this, m) || m;
    let settings;
try {
  settings = global.db.data.settings[this.user.jid];
} catch (e) { console.error(e); }
    
    const isMods = (
      await Promise.all(
        global.config.owner
          .filter(([number, _, isDeveloper]) => number && isDeveloper)
          .map(([number]) => number.replace(/[^0-9]/g, "") + "@s.whatsapp.net")
          .flatMap((pn) => [
            pn,
            this.signalRepository?.lidMapping?.getLIDForPN?.(pn),
          ]),
      )
    ).filter(Boolean).includes(m.sender);

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
            this.signalRepository?.lidMapping?.getLIDForPN?.(pn),
          ]),
        )
      ).filter(Boolean).includes(m.sender);

    const delay = (ms) => new Promise((r) => setTimeout(r, ms));
    
    if (settings?.queque && m.text && !(isMods || isOwner)) {
      let queque = this.msgqueque;
      let time = 5000;
      const previousID = queque[queque.length - 1];
      queque.push(m.id || m.key.id);
      const check = setInterval(async () => {
        if (queque.indexOf(previousID) === -1) clearInterval(check);
        await delay(time);
      }, time);
    }

    if (m.isBaileys || m.fromMe) return;

    const groupMetadata =
      (m.isGroup
        ? (this.chats?.[m.chat] || {}).metadata ||
          (await this.groupMetadata(m.chat).catch(() => null))
        : {}) || {};
    const participants = (m.isGroup ? groupMetadata.participants : []) || [];

    const senderId = this.decodeJid(m.sender);
    const botId = this.decodeJid(this.user.id);

    const user =
      (m.isGroup
        ? participants.find(
            (u) =>
              this.decodeJid(u.id) === senderId ||
              this.decodeJid(u.phoneNumber) === senderId,
          )
        : {}) || {};

    const bot =
      (m.isGroup
        ? participants.find(
            (u) =>
              this.decodeJid(u.id) === botId ||
              this.decodeJid(u.phoneNumber) === botId,
          )
        : {}) || {};

    const isRAdmin = user?.admin === "superadmin";
    const isAdmin = isRAdmin || user?.admin === "admin";
    const isBotAdmin = bot?.admin === "admin" || bot?.admin === "superadmin";

    const ___dirname = path.join(
      path.dirname(fileURLToPath(import.meta.url)),
      "./plugins",
    );

    for (let name in global.plugins) {
      let plugin = global.plugins[name];
      if (!plugin || plugin.disabled) continue;

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

      if (!settings?.restrict) {
        if (plugin.tags && plugin.tags.includes("admin")) continue;
      }

      const prefix = new RegExp("^[\\/!.|•√§∆%✓&\\?]");
      let _prefix = plugin.customPrefix
        ? plugin.customPrefix
        : this.prefix
          ? this.prefix
          : prefix;

      const body = typeof m.text === "string" ? m.text : "";

      let match = (
        _prefix instanceof RegExp
          ? [[_prefix.exec(body), _prefix]]
          : Array.isArray(_prefix)
            ? _prefix.map((p) => {
                let re = p instanceof RegExp ? p : new RegExp(p.replace(/[|\\{}()[\]^$+*?.]/g, "\\$&"));
                return [re.exec(body), re];
              })
            : typeof _prefix === "string"
              ? [
                  [
                    new RegExp(_prefix.replace(/[|\\{}()[\]^$+*?.]/g, "\\$&")).exec(body),
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
        ) continue;
      }

      if (typeof plugin !== "function") continue;

      let usedPrefix;
      if ((usedPrefix = (match?.[0] || "")[0])) {
        let noPrefix = body.replace(usedPrefix, "");
        let [command, ...args] = noPrefix.trim().split` `.filter(Boolean);
        args = args || [];
        let _args = noPrefix.trim().split` `.slice(1);
        let text = _args.join(" ");
        command = (command || "").toLowerCase();

        let fail = plugin.fail || global.dfail;
        let isAccept =
          plugin.command instanceof RegExp
            ? plugin.command.test(command)
            : Array.isArray(plugin.command)
              ? plugin.command.some((cmd) => (cmd instanceof RegExp ? cmd.test(command) : cmd === command))
              : typeof plugin.command === "string"
                ? plugin.command === command
                : false;

        if (!isAccept) continue;
        m.plugin = name;
        let chat = global.db.data.chats[m.chat];
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
        if (
          !isAdmin && !isMods && !isOwner && chat?.adminOnly
        ) return;
        if (
          !isMods && !isOwner && chat?.mute
        ) return;

        if (settings.autoread) await this.readMessages([m.key]).catch(() => {});

        if (plugin.mods && !isMods)
        { fail("mods",   m, this); continue; }
        if (plugin.owner && !isOwner)
        { fail("owner",  m, this); continue; }
        if (plugin.group && !m.isGroup)
        { fail("group",  m, this); continue; }
        if (plugin.restrict)
        { fail("restrict", m, this); continue; }
        if (plugin.botAdmin && !isBotAdmin)
        { fail("botAdmin", m, this); continue; }
        if (plugin.admin && !isAdmin)
        { fail("admin",  m, this); continue; }

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
          
          if (e && settings.noerror) {
            m.reply("🍩 *Upss... ada sedikit error sistem nih~* 🍓");
          } else if (e) {
            let text = format(e);
            for (let key of Object.values(global.config.APIKeys || {}))
              text = text.replace(new RegExp(key, "g"), "#HIDDEN#");
            let errorMsg = `
*╭─❖ 「 💥 Plugin Error Detected! 」*
*│ 📛 Plugin: ${m.plugin}*
*│ 🙋 Sender: ${m.sender}*
*│ 💬 Chat: ${m.chat}*
*╰────────────────────*
*「 📄 Error Logs 」*
\`\`\`
${text}
\`\`\`
━━━━━━━━━━━━━━━━━━━━━━
`.trim();
            await this.sendMessage(
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
              { quoted: m },
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

  const conn = this;
  const chat = global.db.data.chats[id] || {};
  const groupMetadata =
    (await conn.groupMetadata(id)) || (conn.chats[id] || {}).metadata;

  for (const user of participants) {
    const pp = await conn
      .profilePictureUrl(user, "image")
      .catch(() => "https://qu.ax/jVZhH.jpg");
    const img = await canvas(pp);

    let text = "";
    let title = "";
    let body = "";

    switch (action) {
      case "add":
        if (!chat.detect) return;

        text = (
          chat.sWelcome ||
          conn.welcome ||
          "Welcome, @user"
        )
          .replace("@subject", await conn.getName(id))
          .replace("@desc", groupMetadata.desc?.toString() || "unknow")
          .replace("@user", "@" + user.split("@")[0]);

        title = "˚ ༘✦ ִֶ 𓂃⊹ 𝗦𝗲𝗹𝗮𝗺𝗮𝘁 𝗗𝗮𝘁𝗮𝗻𝗴 𝗞𝗮𝗸";
        body = `Kamu adalah member ke-${groupMetadata.participants.length}.`;

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
        break;

      case "remove":
        if (!chat.detect) return;

        text = (
          chat.sBye ||
          conn.bye ||
          "Bye @user"
        )
          .replace("@subject", await conn.getName(id))
          .replace("@desc", groupMetadata.desc?.toString() || "unknow")
          .replace("@user", "@" + user.split("@")[0]);

        title = "˚ ༘✦ ִֶ 𓂃⊹ 𝗦𝗲𝗹𝗮𝗺𝗮𝘁 𝗧𝗶𝗻𝗴𝗴𝗮𝗹 𝗞𝗮𝗸";
        body = `Kini grup berisi ${groupMetadata.participants.length} anggota.`;

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
        break;

      default:
        break;
    }
  }
}

let file = global.__filename(import.meta.url, true);
watchFile(file, async () => {
  unwatchFile(file);
  console.log(
    chalk.cyan.bold(
      "🌸 Aku sedang memperbarui handler.js. Tunggu sebentar, ya!",
    ),
  );
  if (global.reloadHandler) console.log(await global.reloadHandler());
});
