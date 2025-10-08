import { exec as _exec } from "child_process";
import { promisify } from "util";

const exec = promisify(_exec);
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

const handler = async (m, { conn, isMods, command, text }) => {
    if (!isMods) return;
    if (!command || !text) return;

    if (dangerousCommands.some((cmd) => text.trim().startsWith(cmd))) {
        return conn.sendMessage(m.chat, {
            text: ["```", "Command blocked for security reasons.", `> ${text.trim()}`, "```"].join(
                "\n"
            ),
        });
    }

    let output;
    try {
        output = await exec(`${command.trim()} ${text.trim()}`);
    } catch (error) {
        output = error;
    }

    const { stdout, stderr } = output;
    const result = stdout || stderr || "(no output)";
    const message = [
        "```",
        `$ ${command.trim()} ${text.trim()}`,
        "────────────────────────────",
        result.trim(),
        "```",
    ].join("\n");

    await conn.sendMessage(m.chat, { text: message });
};

handler.help = ["$"];
handler.tags = ["owner"];
handler.customPrefix = /^\$ /;
handler.command = /(?:)/i;

export default handler;
