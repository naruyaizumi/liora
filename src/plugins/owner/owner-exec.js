/**
 * @file Terminal command handler
 * @module plugins/owner/terminal
 * @license Apache-2.0
 * @author Naruya Izumi
 */

/**
 * Executes shell commands with owner-only access and safety restrictions
 * @async
 * @function handler
 * @param {Object} m - Message object
 * @param {Object} param1 - Destructured parameters
 * @param {Object} param1.sock - Connection object
 * @param {boolean} param1.isOwner - Whether user is bot owner
 * @returns {Promise<void>}
 *
 * @description
 * Command to execute shell commands in the bot's environment with safety features.
 * Includes command blocking for dangerous operations and flexible flag options.
 *
 * @features
 * - Executes shell commands via bash
 * - Blocks dangerous commands (rm, mkfs, etc.)
 * - Supports command flags (--cwd, --env, --timeout, --verbose)
 * - Shows command output and exit codes
 * - Handles errors gracefully
 * - Only accessible by bot owner
 * - Custom prefix pattern for terminal commands
 */

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

const handler = async (m, { sock, isOwner }) => {
    if (!isOwner) return;
    const txt = m.text || "";
    if (!txt.startsWith("$ ")) return;

    let cmd = txt.slice(2).trim();
    if (!cmd) return;

    const flags = {
        cwd: null,
        env: {},
        quiet: true,
        timeout: null,
    };

    const re = /^--(\w+)(?:=(.+?))?(?:\s+|$)/;
    while (re.test(cmd)) {
        const m = cmd.match(re);
        const [all, f, v] = m;

        if (f === "cwd") {
            flags.cwd = v;
        } else if (f === "env") {
            const [k, val] = v.split("=");
            flags.env[k] = val;
        } else if (f === "timeout") {
            flags.timeout = parseInt(v);
        } else if (f === "verbose") {
            flags.quiet = false;
        }

        cmd = cmd.slice(all.length);
    }

    if (blocked.some((b) => cmd.startsWith(b))) {
        return sock.sendMessage(m.chat, {
            text: ["Command blocked", `> ${cmd}`].join("\n"),
        });
    }

    let out;
    try {
        let c = $`bash -c ${cmd}`;
        if (flags.cwd) {
            c = c.cwd(flags.cwd);
        }
        if (Object.keys(flags.env).length > 0) {
            c = c.env({ ...process.env, ...flags.env });
        }
        if (flags.quiet) {
            c = c.quiet();
        }
        if (flags.timeout) {
            c = c.timeout(flags.timeout);
        }

        const r = await c.nothrow();
        const stdout = r.stdout?.toString() || "";
        const stderr = r.stderr?.toString() || "";
        const exit = r.exitCode;
        const output = stdout || stderr || "(no output)";

        const parts = [`${cmd}`, "─".repeat(30)];

        if (output.trim()) {
            parts.push(output.trim());
        }

        const foot = [];
        if (exit !== 0) {
            foot.push(`Exit: ${exit}`);
        }
        if (flags.cwd) {
            foot.push(`📁 ${flags.cwd}`);
        }

        if (foot.length > 0) {
            parts.push("", foot.join(" • "));
        }

        out = parts.join("\n");
    } catch (e) {
        out = [`${cmd}`, "─".repeat(30), `Error: ${e.message || String(e)}`, ""].join("\n");
    }

    await sock.sendMessage(m.chat, { text: out });
};

/**
 * Custom prefix pattern for terminal commands
 * @property {RegExp} customPrefix - Pattern matching terminal commands
 */
handler.customPrefix = /^\$ /;

/**
 * Command metadata for help system
 * @property {RegExp} command - Command pattern matching
 */
handler.command = /(?:)/i;

export default handler;
