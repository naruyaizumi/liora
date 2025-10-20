import chalk from "chalk";
import { parsePhoneNumber } from "awesome-phonenumber";

export default async function (m, conn = { user: {} }) {
    try {
        if (global.db?.data?.settings?.[conn.user?.jid]?.noprint) return;
        if (!m || !m.sender || !m.chat || !m.mtype) return;
        let parsed = parsePhoneNumber("+" + m.sender.replace(/[^0-9]/g, ""));
        let pn = parsed.valid
            ? parsed.number.e164.replace("+", "")
            : m.sender.replace(/[^0-9]/g, "");
        let user = (await conn.getName(m.sender)) || "Unknown";
        let chat = m.chat;
        let name = (await conn.getName(m.chat)) || "Private Chat";
        let msg = m.text || "";
        if (!/^[/!.]/.test(msg)) return;
        let cmd = msg.split(" ")[0] || "No command";
        let type = m.chat.endsWith("@g.us")
            ? "Group"
            : m.chat.endsWith("@s.whatsapp.net")
              ? "Private"
              : m.chat.endsWith("@broadcast")
                ? "Broadcast"
                : m.chat.endsWith("@newsletter")
                  ? "Channel"
                  : "Unknown";
        const id = m.sender.endsWith("@lid") ? "LID" : "JID";
        console.log(chalk.cyan.bold("────────────────────────────────"));
        console.log(chalk.cyan.bold("CMD LOG"));
        console.log(chalk.cyan.bold("────────────────────────────────"));
        console.log(`${chalk.blue.bold("Sender")}: ${chalk.yellow.bold(pn)} (${id})`);
        console.log(`${chalk.blue.bold("Name")}: ${chalk.yellow.bold(user)}`);
        console.log(`${chalk.blue.bold("Destination")}: ${chalk.bold(type)}`);
        console.log(`${chalk.blue.bold("Subject")}: ${chalk.bold(name)}`);
        console.log(`${chalk.blue.bold("ID")}: ${chalk.bold(chat)}`);
        console.log(`${chalk.blue.bold("Command")}: ${chalk.greenBright.bold(cmd)}`);
    } catch (err) {
        console.error(chalk.red.bold("Error in print.js: " + err.message));
    }
}
