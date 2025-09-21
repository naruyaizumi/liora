/*
Liora WhatsApp Bot
@description Private script for WhatsApp bot based on Node.js and Baileys.
@author      གྷ 𝑵𝒂𝒓𝒖𝒚𝒂 𝑰𝒛𝒖𝒎𝒊 <https://linkbio.co/naruyaizumi>
@co-author   གྷ 𝑺𝑿𝒁𝒏𝒊𝒈𝒉𝒕𝒎𝒂𝒓 <wa.me/6281398961382>
@co-author   གྷ 𝑹𝒚𝒐 𝑨𝒌𝒊𝒓𝒂 <wa.me/6289665362039>
@copyright   © 2024 - 2025 Naruya Izumi
@license     Private License - All Rights Reserved
@notice      This is a privately licensed script.
             Redistribution, reverse-engineering, resale, or modification
             without explicit permission is strictly prohibited.
*/

import chalk from "chalk";
import { parsePhoneNumber } from "awesome-phonenumber";
import { watchFile } from "fs";

export default async function (m, conn = { user: {} }) {
    try {
        if (global.opts?.noprint || global.db?.data?.settings?.[conn.user?.jid]?.noprint) return;
        if (!m || !m.sender || !m.chat || !m.mtype) return;
        let parsed = parsePhoneNumber("+" + m.sender.replace(/[^0-9]/g, ""));
        let phoneNumber = parsed.valid
            ? parsed.number.e164.replace("+", "")
            : m.sender.replace(/[^0-9]/g, "");
        let senderName = (await conn.getName(m.sender)) || "Unknown";
        let chatID = m.chat;
        let chatName = (await conn.getName(m.chat)) || "Private Chat";
        let messageType = m.mtype.replace(/message$/i, "").replace(/^./, (v) => v.toUpperCase());
        let timestamp =
            new Date(m.messageTimestamp * 1000).toLocaleString("id-ID", {
                timeZone: "Asia/Jakarta",
            }) + " WIB";
        let filesize = m.msg
            ? m.msg.fileLength
                ? typeof m.msg.fileLength === "object"
                    ? m.msg.fileLength.low || 0
                    : m.msg.fileLength
                : m.text
                  ? m.text.length
                  : 0
            : m.text
              ? m.text.length
              : 0;
        let sizeInfo =
            m.mtype.includes("audio") ||
            m.mtype.includes("image") ||
            m.mtype.includes("video") ||
            m.mtype.includes("document")
                ? `${filesize} byte`
                : `${filesize} Karakter`;
        let isFromBot = m.key.fromMe ? "🤖 Bot" : "👤 User";
        let messageText = m.text || "";
        let truncatedMessage = messageText.length > 100 ? m.text.substring(0, 100) + "..." : m.text;
        let commandDetected = messageText.startsWith(".")
            ? messageText.split(" ")[0]
            : "Tidak ada command";
        let tujuan = m.chat.endsWith("@g.us")
            ? "Grup"
            : m.chat.endsWith("@s.whatsapp.net")
              ? "Pribadi"
              : m.chat.endsWith("@broadcast")
                ? "Broadcast"
                : m.chat.endsWith("@newsletter")
                  ? "Channel"
                  : m.chat.endsWith("@lid")
                    ? "Komunitas"
                    : "Unknown";
        console.log(chalk.cyan.bold("────────────────────────────────"));
        console.log(chalk.cyan.bold("💌  LOG PESAN"));
        console.log(chalk.cyan.bold("────────────────────────────────"));
        console.log(`${chalk.blue.bold("📨  Pengirim")}: ${chalk.yellow.bold(phoneNumber)}`);
        console.log(`${chalk.blue.bold("🙎  Nama")}: ${chalk.yellow.bold(senderName)}`);
        console.log(`${chalk.blue.bold("📍  Tujuan")}: ${chalk.bold(tujuan)}`);
        console.log(`${chalk.blue.bold("📌  Subjek")}: ${chalk.bold(chatName)}`);
        console.log(`${chalk.blue.bold("🎯  ID")}: ${chalk.bold(chatID)}`);
        console.log(`${chalk.blue.bold("⏰  Waktu")}: ${chalk.bold(timestamp)}`);
        console.log(`${chalk.blue.bold("📁  Tipe")}: ${chalk.bold(messageType)}`);
        console.log(`${chalk.blue.bold("📦  Ukuran")}: ${chalk.bold(sizeInfo)}`);
        console.log(`${chalk.blue.bold("🔍  Sumber")}: ${chalk.bold(isFromBot)}`);
        console.log(
            `${chalk.blue.bold("🗂️  Command")}: ${chalk.greenBright.bold(commandDetected)}`
        );
        console.log(chalk.cyan.bold("────────────────────────────────"));
        if (messageText) {
            console.log(`${chalk.magenta.bold("✉️  Pesan")}`);
            console.log(chalk.bold(truncatedMessage));
            console.log(chalk.cyan.bold("────────────────────────────────"));
        }
    } catch (err) {
        console.error(chalk.red.bold("❌ Error dalam print.js: " + err.message));
    }
}

let file = global.__filename(import.meta.url);
watchFile(file, () => {
    console.log(chalk.redBright("⚡ Update 'print.js' terdeteksi!"));
});
