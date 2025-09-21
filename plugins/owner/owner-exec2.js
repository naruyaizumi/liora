import cp, { exec as _exec } from "child_process";
import { promisify } from "util";
const exec = promisify(_exec).bind(cp);

const dangerousCommands = [
    "rm -rf /",
    "rm -rf *",
    "rm --no-preserve-root -rf /",
    "mkfs.ext4",
    "dd if=",
    "chmod 777 /",
    "chown root:root /",
    "mv /",
    "cp /",
    "shutdown",
    "reboot",
    "poweroff",
    "halt",
    "kill -9 1",
    ">:(){ :|: & };:",
];

const handler = async (m, { conn, isOwner, command, text }) => {
    if (global.conn.user.jid !== conn.user.jid) return;
    if (!isOwner) return;
    if (!command || !text) return;
    if (dangerousCommands.some((cmd) => text.trim().startsWith(cmd))) {
        return conn.sendMessage(m.chat, {
            text: `⚠️ * WARNING!*\n*The command you are trying to execute is extremely dangerous and has been blocked for security reasons.*`,
        });
    }
    let output;
    try {
        output = await exec(command.trimStart() + " " + text.trimEnd());
    } catch (error) {
        output = error;
    } finally {
        const { stdout, stderr } = output;
        if (stdout?.trim()) {
            conn.sendMessage(m.chat, { text: `📤 *Output:*\n\`\`\`${stdout.trim()}\`\`\`` });
        }
        if (stderr?.trim()) {
            conn.sendMessage(m.chat, { text: `❗ *Error Output:*\n\`\`\`${stderr.trim()}\`\`\`` });
        }
    }
};

handler.help = ["$"];
handler.tags = ["owner"];
handler.customPrefix = /^[$] /;
handler.command = new RegExp();
handler.mods = true;

export default handler;
