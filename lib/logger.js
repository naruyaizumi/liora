import chalk from "chalk";

export default async function (m, conn = { user: {} }) {
  try {
    if (global.db?.data?.settings?.[conn.user?.jid]?.noprint) return;
    if (!m || !m.sender || !m.chat || !m.mtype) return;
    let pn = m.sender.replace(/[^0-9]/g, "");
    let user = (await conn.getName(m.sender)) || "Unknown";
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
    console.log(`${chalk.cyan.bold("[CMD]")} ${chalk.yellow(cmd)} — ${chalk.white(user)}`);
    console.log(chalk.gray(`  ↳ ${pn} [${id}]`));
    console.log(chalk.gray(`  ↳ [${type}]`));
  } catch (err) {
    console.error(chalk.red.bold("Error in print.js: " + err.message));
  }
}