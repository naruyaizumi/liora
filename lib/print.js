import chalk from "chalk";

export default async function (m, conn = { user: {} }) {
    try {
        if (global.db?.data?.settings?.[conn.user?.jid]?.noprint) return;
        if (!m || !m.sender || !m.chat || !m.mtype) return;

        const sender = m.sender.split("@")[0];
        const name = (await conn.getName(m.sender)) || "unknown";
        const isGroup = m.chat.endsWith("@g.us");
        const msgText = m.text?.trim()?.replace(/\s+/g, " ") || "";
        const command = msgText.startsWith(".") ? msgText.split(" ")[0] : null;
        if (!command) return;
        const preview = msgText.length > 80 ? msgText.slice(0, 80).trim() + "..." : msgText;

        console.log(
            `${chalk.green("[CMD]")} ${chalk.yellow(command)} — ${chalk.white(name)} ${chalk.gray(`(${sender})`)} ${isGroup ? chalk.cyan("[group]") : chalk.magenta("[private]")}`
        );
        console.log(chalk.gray(`  ↳ ${preview}`));
    } catch (err) {
        console.error(
            `${chalk.cyan("liora")}: ${chalk.redBright("[ERROR]")} ${chalk.white(err.message)}`
        );
    }
}
