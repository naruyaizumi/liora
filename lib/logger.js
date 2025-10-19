import chalk from "chalk";
import { parsePhoneNumber } from "awesome-phonenumber";

export default async function (m, conn = { user: {} }) {
    try {
        if (global.db?.data?.settings?.[conn.user?.jid]?.noprint) return;
        if (!m || !m.sender || !m.chat || !m.mtype) return;
        let parsed = parsePhoneNumber("+" + m.sender.replace(/[^0-9]/g, ""));
        let phoneNumber = parsed.valid
            ? parsed.number.e164.replace("+", "")
            : m.sender.replace(/[^0-9]/g, "");
        let senderName = (await conn.getName(m.sender)) || "Unknown";
        let chatID = m.chat;
        let chatName = (await conn.getName(m.chat)) || "Private Chat";
        let messageType = m.mtype.replace(/message$/i, "").replace(/^./, (v) => v.toUpperCase());
        let timestamp = new Date(m.messageTimestamp * 1000).toLocaleTimeString("en-US", {
            timeZone: "Asia/Jakarta",
            hour: "2-digit",
            minute: "2-digit",
        });
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
                ? `${filesize} bytes`
                : `${filesize} characters`;
        let isFromBot = m.key.fromMe ? "Bot" : "User";
        let messageText = m.text || "";
        if (!/^[\/!.]/.test(messageText)) return;
        let truncatedMessage = messageText.length > 100 ? m.text.substring(0, 100) + "..." : m.text;
        let commandDetected = messageText.split(" ")[0] || "No command";
            
        let tujuan = m.chat.endsWith("@g.us")
            ? "Group"
            : m.chat.endsWith("@s.whatsapp.net")
              ? "Private"
              : m.chat.endsWith("@broadcast")
                ? "Broadcast"
                : m.chat.endsWith("@newsletter")
                  ? "Channel"
                  : "Unknown";

        const senderIdType = m.sender.endsWith("@lid") ? "LID" : "JID";

        console.log(chalk.cyan.bold("────────────────────────────────"));
        console.log(chalk.cyan.bold("MESSAGE LOG"));
        console.log(chalk.cyan.bold("────────────────────────────────"));
        console.log(`${chalk.blue.bold("Sender")}: ${chalk.yellow.bold(phoneNumber)} (${senderIdType})`);
        console.log(`${chalk.blue.bold("Name")}: ${chalk.yellow.bold(senderName)}`);
        console.log(`${chalk.blue.bold("Destination")}: ${chalk.bold(tujuan)}`);
        console.log(`${chalk.blue.bold("Subject")}: ${chalk.bold(chatName)}`);
        console.log(`${chalk.blue.bold("ID")}: ${chalk.bold(chatID)}`);
        console.log(`${chalk.blue.bold("Time")}: ${chalk.bold(timestamp)}`);
        console.log(`${chalk.blue.bold("Type")}: ${chalk.bold(messageType)}`);
        console.log(`${chalk.blue.bold("Size")}: ${chalk.bold(sizeInfo)}`);
        console.log(`${chalk.blue.bold("Source")}: ${chalk.bold(isFromBot)}`);
        console.log(`${chalk.blue.bold("Command")}: ${chalk.greenBright.bold(commandDetected)}`);
        console.log(chalk.cyan.bold("────────────────────────────────"));
        console.log(`${chalk.magenta.bold("Message")}`);
        console.log(chalk.bold(truncatedMessage));
        console.log(chalk.cyan.bold("────────────────────────────────"));
    } catch (err) {
        console.error(chalk.red.bold("Error in print.js: " + err.message));
    }
}