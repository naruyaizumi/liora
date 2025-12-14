import { exec } from "child_process";
import { promisify } from "util";
const execAsync = promisify(exec);

const blocked = [
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

const handler = async (m, { conn, isOwner }) => {
    if (!isOwner) return;
    const fullText = m.text || "";
    if (!fullText.startsWith("$ ")) return;

    let cmdText = fullText.slice(2).trim();
    if (!cmdText) return;

    const flags = {
        cwd: null,
        env: {},
        timeout: null,
    };

    // $ --cwd=/tmp --env=KEY=VALUE --timeout=5000 command
    const flagRegex = /^--(\w+)(?:=(.+?))?(?:\s+|$)/;
    while (flagRegex.test(cmdText)) {
        const match = cmdText.match(flagRegex);
        const [fullMatch, flag, value] = match;

        if (flag === "cwd") {
            flags.cwd = value;
        } else if (flag === "env") {
            const [key, val] = value.split("=");
            flags.env[key] = val;
        } else if (flag === "timeout") {
            flags.timeout = parseInt(value);
        }

        cmdText = cmdText.slice(fullMatch.length);
    }

    if (blocked.some((cmd) => cmdText.startsWith(cmd))) {
        return conn.sendMessage(m.chat, {
            text: ["Command blocked for security reasons.", `> ${cmdText}`].join("\n"),
        });
    }

    let resultText;
    try {
        const options = {
            cwd: flags.cwd || process.cwd(),
            env: { ...process.env, ...flags.env },
            timeout: flags.timeout || 30000,
            shell: '/bin/bash',
            maxBuffer: 1024 * 1024 * 10,
        };

        const result = await execAsync(cmdText, options);
        const stdout = result.stdout || "";
        const stderr = result.stderr || "";
        const exitCode = 0;
        const output = stdout || stderr || "(no output)";
        const parts = [`${cmdText}`, "────────────────────────────"];

        if (output.trim()) {
            parts.push(output.trim());
        }
        const footer = [];
        if (exitCode !== 0) {
            footer.push(`Exit code: ${exitCode}`);
        }
        if (flags.cwd) {
            footer.push(`📁 ${flags.cwd}`);
        }

        if (footer.length > 0) {
            parts.push("", footer.join(" • "));
        }

        resultText = parts.join("\n");
    } catch (err) {
        const exitCode = err.code || 1;
        const stdout = err.stdout || "";
        const stderr = err.stderr || err.message || "";
        const output = stdout || stderr || "(no output)";
        
        const parts = [
            `${cmdText}`,
            "────────────────────────────",
            output.trim(),
        ];
        
        const footer = [`Exit code: ${exitCode}`];
        if (flags.cwd) {
            footer.push(`📁 ${flags.cwd}`);
        }
        
        if (footer.length > 0) {
            parts.push("", footer.join(" • "));
        }
        
        resultText = parts.join("\n");
    }

    await conn.sendMessage(m.chat, { text: resultText });
};

handler.help = ["$"];
handler.tags = ["owner"];
handler.customPrefix = /^\$ /;
handler.command = /(?:)/i;

export default handler;