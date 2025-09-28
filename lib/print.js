import chalk from "chalk";
import { parsePhoneNumber } from "awesome-phonenumber";
import { watchFile } from "fs";

export default async function (m, conn = { user: {} }) {
    try {
        if (global.opts?.noprint || global.db?.data?.settings?.[conn.user?.jid]?.noprint) return;
        if (!m || !m.sender || !m.chat) return;

        let parsed = parsePhoneNumber("+" + m.sender.replace(/[^0-9]/g, ""));
        let phoneNumber = parsed.valid
            ? parsed.number.e164.replace("+", "")
            : m.sender.replace(/[^0-9]/g, "");
        let senderName = (await conn.getName(m.sender)) || "Unknown";
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
        let chatID = m.chat;
        let messageText = m.text || "";
        let truncatedMessage = messageText.length > 100 ? m.text.substring(0, 100) + "..." : m.text;

        console.log(chalk.cyan.bold("──────────────────────────────"));
        console.log(chalk.cyan.bold("💌  LOG PESAN SEDERHANA"));
        console.log(chalk.cyan.bold("──────────────────────────────"));
        console.log(`${chalk.blue.bold("📨  Pengirim")}: ${chalk.yellow.bold(phoneNumber)}`);
        console.log(`${chalk.blue.bold("🙎  Nama")}: ${chalk.yellow.bold(senderName)}`);
        console.log(`${chalk.blue.bold("📍  Tujuan")}: ${chalk.bold(tujuan)}`);
        console.log(`${chalk.blue.bold("🎯  ID")}: ${chalk.bold(chatID)}`);
        if (truncatedMessage) {
            console.log(`${chalk.blue.bold("✉️  Pesan")}: ${chalk.bold(truncatedMessage)}`);
        }
        console.log(chalk.cyan.bold("──────────────────────────────"));
    } catch (err) {
        console.error(chalk.red.bold("❌ Error dalam print.js: " + err.message));
    }
}

let file = global.__filename(import.meta.url);
watchFile(file, () => {
    console.log(chalk.redBright("⚡ Update 'print.js' terdeteksi!"));
});