import { $ } from "bun";

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
        quiet: true,
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
        } else if (flag === "verbose") {
            flags.quiet = false;
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
        let command = $`bash -c ${cmdText}`;
        if (flags.cwd) {
            command = command.cwd(flags.cwd);
        }
        if (Object.keys(flags.env).length > 0) {
            command = command.env({ ...process.env, ...flags.env });
        }
        if (flags.quiet) {
            command = command.quiet();
        }
        if (flags.timeout) {
            command = command.timeout(flags.timeout);
        }
        const result = await command.nothrow();
        const stdout = result.stdout?.toString() || "";
        const stderr = result.stderr?.toString() || "";
        const exitCode = result.exitCode;
        const output = stdout || stderr || "(no output)";
        const parts = [`$ ${cmdText}`, "────────────────────────────"];

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
        resultText = [
            `$ ${cmdText}`,
            "────────────────────────────",
            `Error: ${err.message || String(err)}`,
            "",
        ].join("\n");
    }

    await conn.sendMessage(m.chat, { text: resultText });
};

handler.help = ["$"];
handler.tags = ["owner"];
handler.customPrefix = /^\$ /;
handler.command = /(?:)/i;

export default handler;
